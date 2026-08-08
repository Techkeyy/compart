use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, transfer, CreateAccount, Transfer};
use ephemeral_rollups_sdk::{
    access_control::{
        instructions::{CreateEphemeralPermissionCpi, UpdateEphemeralPermissionCpi},
        structs::{
            EphemeralMembersArgs, EphemeralPermission, Member, AUTHORITY_FLAG, PERMISSION_SEED,
            TX_BALANCES_FLAG, TX_LOGS_FLAG, TX_MESSAGE_FLAG,
        },
    },
    anchor::{commit, delegate, ephemeral, ephemeral_accounts},
    consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID},
    cpi::DelegateConfig,
    ephem::MagicIntentBundleBuilder,
};
use std::collections::BTreeSet;

declare_id!("9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs");

pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const BID_SEED: &[u8] = b"bid";
pub const PRIVATE_BUDGET_SEED: &[u8] = b"private-budget";
pub const OFFER_SEED: &[u8] = b"offer";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const MAX_BIDS: u16 = 25;
pub const MAX_OFFERS: u8 = 3;

#[ephemeral]
#[program]
pub mod compartido_market {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: u64,
        title: [u8; 32],
        target_quantity: u16,
        deposit_cap: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(target_quantity > 0, CompartidoError::InvalidQuantity);
        require!(deposit_cap > 0, CompartidoError::InvalidPrice);
        require!(
            deadline > Clock::get()?.unix_timestamp,
            CompartidoError::InvalidDeadline
        );

        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.campaign_id = campaign_id;
        campaign.title = title;
        campaign.target_quantity = target_quantity;
        campaign.deposit_cap = deposit_cap;
        campaign.deadline = deadline;
        campaign.status = CampaignStatus::Open;
        campaign.bid_count = 0;
        campaign.offer_count = 0;
        campaign.total_requested = 0;
        campaign.clearing_price = 0;
        campaign.winning_supplier = Pubkey::default();
        campaign.available_quantity = 0;
        campaign.allocated_quantity = 0;
        campaign.treasury_bump = ctx.bumps.treasury;
        campaign.bump = ctx.bumps.campaign;

        if ctx.accounts.treasury.lamports() == 0 {
            let campaign_key = campaign.key();
            let treasury_signer: &[&[u8]] =
                &[TREASURY_SEED, campaign_key.as_ref(), &[ctx.bumps.treasury]];
            create_account(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    CreateAccount {
                        from: ctx.accounts.creator.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[treasury_signer],
                ),
                Rent::get()?.minimum_balance(0),
                0,
                &anchor_lang::system_program::ID,
            )?;
        }

        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator: campaign.creator,
            target_quantity,
            deposit_cap,
            deadline,
        });
        Ok(())
    }

    /// Creates a public commitment and escrows against the campaign-wide safety
    /// ceiling. A buyer's real maximum never appears in this account.
    pub fn create_bid(ctx: Context<CreateBid>, quantity: u16) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Open,
            CompartidoError::CampaignNotOpen
        );
        require!(now < campaign.deadline, CompartidoError::CampaignClosed);
        require!(
            campaign.bid_count < MAX_BIDS,
            CompartidoError::BidLimitReached
        );
        require!(quantity > 0, CompartidoError::InvalidQuantity);

        let deposit = checked_cost(quantity, campaign.deposit_cap)?;
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            deposit,
        )?;

        let bid_info = ctx.accounts.bid.to_account_info();
        let bid = &mut ctx.accounts.bid;
        bid.campaign = campaign.key();
        bid.buyer = ctx.accounts.buyer.key();
        bid.quantity = quantity;
        bid.deposit = deposit;
        bid.allocated_quantity = 0;
        bid.refund_owed = 0;
        bid.allocation_computed = false;
        bid.settled = false;
        bid.refund_claimed = false;
        bid.receipt_claimed = false;
        bid.created_at = now;
        bid.bump = ctx.bumps.bid;

        // Pre-fund the delegated commitment so it can sponsor an ER-only private
        // budget account and its two-member permission without exposing the
        // private amount on the base layer.
        let private_budget_sponsor =
            ephemeral_rollups_sdk::ephemeral_accounts::rent((8 + PrivateBudget::LEN) as u32)
                .checked_add(ephemeral_rollups_sdk::ephemeral_accounts::rent(
                    EphemeralPermission::size_of(2) as u32,
                ))
                .ok_or(CompartidoError::MathOverflow)?;
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: bid_info,
                },
            ),
            private_budget_sponsor,
        )?;

        campaign.bid_count = campaign
            .bid_count
            .checked_add(1)
            .ok_or(CompartidoError::MathOverflow)?;
        campaign.total_requested = campaign
            .total_requested
            .checked_add(quantity as u32)
            .ok_or(CompartidoError::MathOverflow)?;

        emit!(BidSubmitted {
            campaign: campaign.key(),
            buyer: bid.buyer,
            quantity
        });
        Ok(())
    }

    /// Creates the secret budget PDA directly inside the Private ER. Unlike a
    /// delegated base-layer account, an `eph` account has no public state to leak.
    pub fn place_private_budget(
        ctx: Context<PlacePrivateBudget>,
        max_unit_price: u64,
    ) -> Result<()> {
        require!(max_unit_price > 0, CompartidoError::InvalidPrice);
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline,
            CompartidoError::CampaignClosed
        );
        require!(
            max_unit_price <= ctx.accounts.campaign.deposit_cap,
            CompartidoError::EscrowInvariant
        );

        ctx.accounts
            .create_ephemeral_private_budget((8 + PrivateBudget::LEN) as u32)?;
        let private_budget = PrivateBudget {
            campaign: ctx.accounts.campaign.key(),
            commitment: ctx.accounts.bid.key(),
            buyer: ctx.accounts.buyer.key(),
            max_unit_price,
            bump: ctx.bumps.private_budget,
        };
        write_private_budget(
            &ctx.accounts.private_budget.to_account_info(),
            &private_budget,
        )?;
        Ok(())
    }

    /// Lets a participant revise their secret ceiling before the room closes.
    /// The private account remains inside the TEE and its permission is unchanged.
    pub fn update_private_budget(
        ctx: Context<UpdatePrivateBudget>,
        max_unit_price: u64,
    ) -> Result<()> {
        require!(max_unit_price > 0, CompartidoError::InvalidPrice);
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline,
            CompartidoError::CampaignClosed
        );
        require!(
            max_unit_price <= ctx.accounts.campaign.deposit_cap,
            CompartidoError::EscrowInvariant
        );
        ctx.accounts.private_budget.max_unit_price = max_unit_price;
        Ok(())
    }

    /// Restricts the ER-only budget to its owner and the room organizer. Other
    /// participants can observe aggregate progress but cannot query this account.
    pub fn init_private_budget_permission(ctx: Context<PrivateBudgetPermission>) -> Result<()> {
        if !ctx.accounts.permission.data_is_empty() {
            return Ok(());
        }

        let campaign_key = ctx.accounts.campaign.key();
        let buyer_key = ctx.accounts.buyer.key();
        let bid_bump = [ctx.accounts.bid.bump];
        let bid_signers: &[&[u8]] = &[
            BID_SEED,
            campaign_key.as_ref(),
            buyer_key.as_ref(),
            &bid_bump,
        ];
        let budget_bump = [ctx.accounts.private_budget.bump];
        let commitment_key = ctx.accounts.bid.key();
        let budget_signers: &[&[u8]] =
            &[PRIVATE_BUDGET_SEED, commitment_key.as_ref(), &budget_bump];

        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.bid.to_account_info(),
            permissioned_account: ctx.accounts.private_budget.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: vec![
                    permission_member(ctx.accounts.campaign.creator),
                    permission_member(ctx.accounts.buyer.key()),
                ],
            },
        }
        .invoke_signed(&[bid_signers, budget_signers])?;
        Ok(())
    }

    pub fn delegate_bid(ctx: Context<DelegateBid>) -> Result<()> {
        if ctx.accounts.bid.owner != &ephemeral_rollups_sdk::id() {
            ctx.accounts.delegate_bid(
                &ctx.accounts.buyer,
                &[
                    BID_SEED,
                    ctx.accounts.campaign.key().as_ref(),
                    ctx.accounts.buyer.key().as_ref(),
                ],
                DelegateConfig {
                    validator: ctx.accounts.validator.as_ref().map(|v| v.key()),
                    ..Default::default()
                },
            )?;
        }
        Ok(())
    }

    /// Delegates the public campaign only after a supplier has been selected so
    /// private allocation can update the aggregate outcome inside the ER.
    pub fn delegate_campaign(ctx: Context<DelegateCampaign>, campaign_id: u64) -> Result<()> {
        ctx.accounts.delegate_campaign(
            &ctx.accounts.creator,
            &[
                CAMPAIGN_SEED,
                ctx.accounts.creator.key().as_ref(),
                &campaign_id.to_le_bytes(),
            ],
            DelegateConfig {
                validator: ctx.accounts.validator.as_ref().map(|v| v.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Creates a private permission on the ER. Only this buyer can inspect the
    /// bid PDA through the TEE endpoint.
    pub fn init_bid_permission(ctx: Context<BidPermissionContext>) -> Result<()> {
        if ctx.accounts.permission.lamports() > 0 {
            return Ok(());
        }
        let campaign_key = ctx.accounts.campaign.key();
        let buyer_key = ctx.accounts.buyer.key();
        let bid_bump = [ctx.accounts.bid.bump];
        let signers = [
            BID_SEED,
            campaign_key.as_ref(),
            buyer_key.as_ref(),
            &bid_bump,
        ];
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.bid.to_account_info(),
            permissioned_account: ctx.accounts.bid.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: vec![
                    permission_member(ctx.accounts.campaign.creator),
                    permission_member(ctx.accounts.buyer.key()),
                ],
            },
        }
        .invoke_signed(&[&signers])?;
        Ok(())
    }

    pub fn set_bid_privacy(ctx: Context<BidPermissionContext>, is_private: bool) -> Result<()> {
        let campaign_key = ctx.accounts.campaign.key();
        let buyer_key = ctx.accounts.buyer.key();
        let bid_bump = [ctx.accounts.bid.bump];
        let signers = [
            BID_SEED,
            campaign_key.as_ref(),
            buyer_key.as_ref(),
            &bid_bump,
        ];
        let members = if is_private {
            vec![
                permission_member(ctx.accounts.campaign.creator),
                permission_member(ctx.accounts.buyer.key()),
            ]
        } else {
            vec![]
        };
        UpdateEphemeralPermissionCpi {
            payer: ctx.accounts.bid.to_account_info(),
            permissioned_account: ctx.accounts.bid.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            authority: ctx.accounts.bid.to_account_info(),
            authority_is_signer: false,
            args: EphemeralMembersArgs {
                is_private,
                members,
            },
        }
        .invoke_signed(&[&signers])?;
        Ok(())
    }

    pub fn undelegate_bid(ctx: Context<UndelegateBid>) -> Result<()> {
        require!(
            ctx.accounts.bid.allocation_computed,
            CompartidoError::AllocationsNotComputed
        );
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.bid.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn undelegate_campaign(ctx: Context<UndelegateCampaign>) -> Result<()> {
        require!(
            ctx.accounts.campaign.status == CampaignStatus::AllocationsComputed,
            CompartidoError::AllocationsNotComputed
        );
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.campaign.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn post_supplier_offer(
        ctx: Context<PostSupplierOffer>,
        quantity: u16,
        unit_price: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Open,
            CompartidoError::CampaignNotOpen
        );
        require!(now < campaign.deadline, CompartidoError::CampaignClosed);
        require!(
            campaign.offer_count < MAX_OFFERS,
            CompartidoError::OfferLimitReached
        );
        require!(
            quantity >= campaign.target_quantity,
            CompartidoError::InsufficientSupply
        );
        require!(unit_price > 0, CompartidoError::InvalidPrice);

        let offer = &mut ctx.accounts.offer;
        offer.campaign = campaign.key();
        offer.supplier = ctx.accounts.supplier.key();
        offer.quantity = quantity;
        offer.unit_price = unit_price;
        offer.active = true;
        offer.created_at = now;
        offer.bump = ctx.bumps.offer;
        campaign.offer_count = campaign
            .offer_count
            .checked_add(1)
            .ok_or(CompartidoError::MathOverflow)?;

        emit!(SupplierOfferPosted {
            campaign: campaign.key(),
            supplier: offer.supplier,
            quantity,
            unit_price,
        });
        Ok(())
    }

    /// Every offer must be passed, preventing callers from hiding a cheaper supplier.
    pub fn select_winning_offer(ctx: Context<SelectWinningOffer>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Open,
            CompartidoError::CampaignNotOpen
        );
        require!(
            now >= campaign.deadline,
            CompartidoError::DeadlineNotReached
        );
        require!(campaign.offer_count > 0, CompartidoError::NoOffers);
        require!(
            ctx.remaining_accounts.len() == campaign.offer_count as usize,
            CompartidoError::IncompleteOfferSet
        );

        let mut seen = BTreeSet::new();
        let mut best: Option<(u64, Pubkey, u16)> = None;
        for info in ctx.remaining_accounts.iter() {
            require_keys_eq!(*info.owner, crate::ID, CompartidoError::InvalidAccountOwner);
            let data = info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            let offer = SupplierOffer::try_deserialize(&mut slice)
                .map_err(|_| CompartidoError::InvalidOfferAccount)?;
            require_keys_eq!(
                offer.campaign,
                campaign.key(),
                CompartidoError::WrongCampaign
            );
            require!(offer.active, CompartidoError::InactiveOffer);
            require!(
                offer.quantity >= campaign.target_quantity,
                CompartidoError::InsufficientSupply
            );
            require!(
                seen.insert(offer.supplier),
                CompartidoError::DuplicateAccount
            );

            let candidate = (offer.unit_price, offer.supplier, offer.quantity);
            if best
                .as_ref()
                .map(|current| {
                    (candidate.0, candidate.1.to_bytes()) < (current.0, current.1.to_bytes())
                })
                .unwrap_or(true)
            {
                best = Some(candidate);
            }
        }

        let (price, supplier, quantity) = best.ok_or(CompartidoError::NoOffers)?;
        campaign.clearing_price = price;
        campaign.winning_supplier = supplier;
        campaign.available_quantity = quantity;
        campaign.status = CampaignStatus::OfferSelected;
        emit!(WinningOfferSelected {
            campaign: campaign.key(),
            supplier,
            quantity,
            clearing_price: price,
        });
        Ok(())
    }

    /// Computes allocations inside the Private ER. Remaining accounts must be
    /// ordered as `(public commitment, ER-only private budget)` pairs. Only the
    /// outcome is written into delegated public state; private maxima stay in
    /// their ER-only accounts and are never committed to Solana.
    pub fn compute_allocations(ctx: Context<ComputeAllocations>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::OfferSelected,
            CompartidoError::OfferNotSelected
        );
        require!(
            Clock::get()?.unix_timestamp >= campaign.deadline,
            CompartidoError::DeadlineNotReached
        );
        require!(
            ctx.remaining_accounts.len() == campaign.bid_count as usize * 2,
            CompartidoError::IncompletePrivateBudgetSet
        );

        let mut entries: Vec<(AccountInfo, Bid, u64)> =
            Vec::with_capacity(campaign.bid_count as usize);
        let mut seen = BTreeSet::new();

        for pair in ctx.remaining_accounts.chunks_exact(2) {
            let bid_info = &pair[0];
            let budget_info = &pair[1];
            require_keys_eq!(
                *bid_info.owner,
                crate::ID,
                CompartidoError::InvalidAccountOwner
            );
            require_keys_eq!(
                *budget_info.owner,
                crate::ID,
                CompartidoError::InvalidAccountOwner
            );
            require!(bid_info.is_writable, CompartidoError::AccountMustBeWritable);

            let bid_data = bid_info.try_borrow_data()?;
            let mut bid_slice: &[u8] = &bid_data;
            let bid = Bid::try_deserialize(&mut bid_slice)
                .map_err(|_| CompartidoError::InvalidBidAccount)?;
            drop(bid_data);

            let budget_data = budget_info.try_borrow_data()?;
            let mut budget_slice: &[u8] = &budget_data;
            let budget = PrivateBudget::try_deserialize(&mut budget_slice)
                .map_err(|_| CompartidoError::InvalidPrivateBudgetAccount)?;
            drop(budget_data);

            require_keys_eq!(bid.campaign, campaign.key(), CompartidoError::WrongCampaign);
            require_keys_eq!(
                budget.campaign,
                campaign.key(),
                CompartidoError::WrongCampaign
            );
            require_keys_eq!(
                budget.commitment,
                bid_info.key(),
                CompartidoError::WrongCommitment
            );
            require_keys_eq!(budget.buyer, bid.buyer, CompartidoError::WrongBuyer);
            require!(
                !bid.allocation_computed,
                CompartidoError::AllocationsAlreadyComputed
            );
            require!(!bid.settled, CompartidoError::BidAlreadySettled);
            require!(
                budget.max_unit_price <= campaign.deposit_cap,
                CompartidoError::EscrowInvariant
            );
            require!(seen.insert(bid.buyer), CompartidoError::DuplicateAccount);

            let expected_bid = Pubkey::find_program_address(
                &[BID_SEED, campaign.key().as_ref(), bid.buyer.as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(
                bid_info.key(),
                expected_bid,
                CompartidoError::InvalidBidAccount
            );
            let expected_budget = Pubkey::find_program_address(
                &[PRIVATE_BUDGET_SEED, bid_info.key().as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(
                budget_info.key(),
                expected_budget,
                CompartidoError::InvalidPrivateBudgetAccount
            );

            entries.push((bid_info.clone(), bid, budget.max_unit_price));
        }

        let allocation_inputs = entries
            .iter()
            .map(|(_, bid, private_max)| PrivateAllocationInput {
                buyer: bid.buyer,
                quantity: bid.quantity,
                private_max: *private_max,
                deposit: bid.deposit,
            })
            .collect::<Vec<_>>();
        let (allocated_total, outcomes) = calculate_private_outcomes(
            &allocation_inputs,
            campaign.target_quantity,
            campaign.clearing_price,
        )?;

        for ((_, bid, _), outcome) in entries.iter_mut().zip(outcomes) {
            bid.allocated_quantity = outcome.allocated_quantity;
            bid.refund_owed = outcome.refund_owed;
        }

        for (info, mut bid, _) in entries {
            bid.allocation_computed = true;
            let mut data = info.try_borrow_mut_data()?;
            bid.try_serialize(&mut &mut data[..])?;
        }

        campaign.allocated_quantity = allocated_total;
        campaign.status = CampaignStatus::AllocationsComputed;
        emit!(AllocationsComputed {
            campaign: campaign.key(),
            allocated_quantity: allocated_total,
        });
        Ok(())
    }

    /// Pays the selected supplier from public, committed allocation outcomes.
    pub fn settle_campaign(ctx: Context<SettleCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::AllocationsComputed,
            CompartidoError::AllocationsNotComputed
        );
        require_keys_eq!(
            ctx.accounts.supplier.key(),
            campaign.winning_supplier,
            CompartidoError::WrongSupplier
        );
        require!(
            ctx.remaining_accounts.len() == campaign.bid_count as usize,
            CompartidoError::IncompleteBidSet
        );

        let mut bids: Vec<(AccountInfo, Bid)> = Vec::with_capacity(ctx.remaining_accounts.len());
        let mut seen = BTreeSet::new();
        let mut allocated_total = 0u32;
        let mut payout = 0u64;
        for info in ctx.remaining_accounts.iter() {
            require_keys_eq!(*info.owner, crate::ID, CompartidoError::InvalidAccountOwner);
            require!(info.is_writable, CompartidoError::AccountMustBeWritable);
            let data = info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            let bid =
                Bid::try_deserialize(&mut slice).map_err(|_| CompartidoError::InvalidBidAccount)?;
            require_keys_eq!(bid.campaign, campaign.key(), CompartidoError::WrongCampaign);
            require!(
                bid.allocation_computed,
                CompartidoError::AllocationsNotComputed
            );
            require!(!bid.settled, CompartidoError::BidAlreadySettled);
            require!(seen.insert(bid.buyer), CompartidoError::DuplicateAccount);
            require!(
                bid.allocated_quantity <= bid.quantity,
                CompartidoError::EscrowInvariant
            );

            let expected_bid = Pubkey::find_program_address(
                &[BID_SEED, campaign.key().as_ref(), bid.buyer.as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(info.key(), expected_bid, CompartidoError::InvalidBidAccount);

            let charged = checked_cost(bid.allocated_quantity, campaign.clearing_price)?;
            require!(charged <= bid.deposit, CompartidoError::EscrowInvariant);
            require_eq!(
                bid.refund_owed,
                bid.deposit
                    .checked_sub(charged)
                    .ok_or(CompartidoError::MathOverflow)?,
                CompartidoError::EscrowInvariant
            );
            allocated_total = allocated_total
                .checked_add(u32::from(bid.allocated_quantity))
                .ok_or(CompartidoError::MathOverflow)?;
            payout = payout
                .checked_add(charged)
                .ok_or(CompartidoError::MathOverflow)?;
            drop(data);
            bids.push((info.clone(), bid));
        }

        let viable = allocated_total == u32::from(campaign.target_quantity)
            && allocated_total == campaign.allocated_quantity;
        if !viable {
            require_eq!(
                campaign.allocated_quantity,
                0,
                CompartidoError::EscrowInvariant
            );
            require_eq!(allocated_total, 0, CompartidoError::EscrowInvariant);
            payout = 0;
        }

        for (info, mut bid) in bids {
            bid.settled = true;
            let mut data = info.try_borrow_mut_data()?;
            bid.try_serialize(&mut &mut data[..])?;
        }

        if payout > 0 {
            let campaign_key = campaign.key();
            let treasury_signer: &[&[u8]] = &[
                TREASURY_SEED,
                campaign_key.as_ref(),
                &[campaign.treasury_bump],
            ];
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    Transfer {
                        from: ctx.accounts.treasury.to_account_info(),
                        to: ctx.accounts.supplier.to_account_info(),
                    },
                    &[treasury_signer],
                ),
                payout,
            )?;
        }

        campaign.status = if viable {
            CampaignStatus::Settled
        } else {
            CampaignStatus::Cancelled
        };
        emit!(CampaignSettled {
            campaign: campaign.key(),
            supplier: campaign.winning_supplier,
            allocated_quantity: allocated_total,
            clearing_price: campaign.clearing_price,
            supplier_payout: payout,
        });
        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Settled
                || campaign.status == CampaignStatus::Cancelled,
            CompartidoError::CampaignNotSettled
        );
        let bid = &mut ctx.accounts.bid;
        require!(bid.settled, CompartidoError::BidNotSettled);
        require!(!bid.refund_claimed, CompartidoError::RefundAlreadyClaimed);

        let amount = bid.refund_owed;
        bid.refund_claimed = true;
        bid.refund_owed = 0;
        if amount > 0 {
            let campaign_key = campaign.key();
            let treasury_signer: &[&[u8]] = &[
                TREASURY_SEED,
                campaign_key.as_ref(),
                &[campaign.treasury_bump],
            ];
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    Transfer {
                        from: ctx.accounts.treasury.to_account_info(),
                        to: ctx.accounts.buyer.to_account_info(),
                    },
                    &[treasury_signer],
                ),
                amount,
            )?;
        }

        emit!(RefundClaimed {
            campaign: campaign.key(),
            buyer: ctx.accounts.buyer.key(),
            amount
        });
        Ok(())
    }

    pub fn claim_access_receipt(ctx: Context<ClaimAccessReceipt>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Settled,
            CompartidoError::CampaignNotSettled
        );
        let bid = &mut ctx.accounts.bid;
        require!(bid.settled, CompartidoError::BidNotSettled);
        require!(bid.allocated_quantity > 0, CompartidoError::NoAllocation);
        require!(!bid.receipt_claimed, CompartidoError::ReceiptAlreadyClaimed);

        let receipt = &mut ctx.accounts.receipt;
        receipt.campaign = campaign.key();
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.supplier = campaign.winning_supplier;
        receipt.quantity = bid.allocated_quantity;
        receipt.unit_price = campaign.clearing_price;
        receipt.claimed_at = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;
        bid.receipt_claimed = true;

        emit!(AccessReceiptClaimed {
            campaign: campaign.key(),
            buyer: receipt.buyer,
            quantity: receipt.quantity,
            unit_price: receipt.unit_price,
        });
        Ok(())
    }
}

#[derive(Clone, Copy)]
struct PrivateAllocationInput {
    buyer: Pubkey,
    quantity: u16,
    private_max: u64,
    deposit: u64,
}

#[derive(Clone, Copy, Default)]
struct PrivateAllocationOutcome {
    allocated_quantity: u16,
    refund_owed: u64,
}

fn calculate_private_outcomes(
    inputs: &[PrivateAllocationInput],
    target_quantity: u16,
    clearing_price: u64,
) -> Result<(u32, Vec<PrivateAllocationOutcome>)> {
    let mut order = (0..inputs.len()).collect::<Vec<_>>();
    order.sort_by(|left, right| {
        inputs[*right]
            .private_max
            .cmp(&inputs[*left].private_max)
            .then_with(|| {
                inputs[*left]
                    .buyer
                    .to_bytes()
                    .cmp(&inputs[*right].buyer.to_bytes())
            })
    });

    let mut remaining = u32::from(target_quantity);
    let mut allocated_total = 0u32;
    let mut outcomes = vec![PrivateAllocationOutcome::default(); inputs.len()];
    for index in order {
        let input = inputs[index];
        let allocated = if input.private_max >= clearing_price && remaining > 0 {
            u32::from(input.quantity).min(remaining) as u16
        } else {
            0
        };
        let charged = checked_cost(allocated, clearing_price)?;
        require!(charged <= input.deposit, CompartidoError::EscrowInvariant);
        outcomes[index] = PrivateAllocationOutcome {
            allocated_quantity: allocated,
            refund_owed: input
                .deposit
                .checked_sub(charged)
                .ok_or(CompartidoError::MathOverflow)?,
        };
        remaining = remaining
            .checked_sub(u32::from(allocated))
            .ok_or(CompartidoError::MathOverflow)?;
        allocated_total = allocated_total
            .checked_add(u32::from(allocated))
            .ok_or(CompartidoError::MathOverflow)?;
    }

    if allocated_total != u32::from(target_quantity) {
        allocated_total = 0;
        for (outcome, input) in outcomes.iter_mut().zip(inputs) {
            outcome.allocated_quantity = 0;
            outcome.refund_owed = input.deposit;
        }
    }

    Ok((allocated_total, outcomes))
}

fn checked_cost(quantity: u16, unit_price: u64) -> Result<u64> {
    u64::from(quantity)
        .checked_mul(unit_price)
        .ok_or_else(|| error!(CompartidoError::MathOverflow))
}

fn permission_member(pubkey: Pubkey) -> Member {
    Member {
        flags: AUTHORITY_FLAG | TX_LOGS_FLAG | TX_MESSAGE_FLAG | TX_BALANCES_FLAG,
        pubkey,
    }
}

fn write_private_budget(account_info: &AccountInfo, budget: &PrivateBudget) -> Result<()> {
    let mut data = account_info.try_borrow_mut_data()?;
    budget.try_serialize(&mut &mut data[..])?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct InitializeCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = Campaign::SPACE,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: System-owned escrow PDA created by this instruction.
    #[account(mut, seeds = [TREASURY_SEED, campaign.key().as_ref()], bump)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBid<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = buyer,
        space = Bid::SPACE,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,
    /// CHECK: Verified by campaign-derived PDA seeds.
    #[account(mut, seeds = [TREASURY_SEED, campaign.key().as_ref()], bump = campaign.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[ephemeral_accounts]
#[derive(Accounts)]
pub struct PlacePrivateBudget<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        sponsor,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    /// CHECK: ER-only private budget PDA sponsored by the public commitment.
    #[account(
        mut,
        eph,
        seeds = [PRIVATE_BUDGET_SEED, bid.key().as_ref()],
        bump,
    )]
    pub private_budget: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdatePrivateBudget<'info> {
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    #[account(
        mut,
        seeds = [PRIVATE_BUDGET_SEED, bid.key().as_ref()],
        bump = private_budget.bump,
        has_one = campaign,
        has_one = buyer,
        constraint = private_budget.commitment == bid.key() @ CompartidoError::WrongCommitment,
    )]
    pub private_budget: Account<'info, PrivateBudget>,
}

#[derive(Accounts)]
pub struct PrivateBudgetPermission<'info> {
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    #[account(
        mut,
        seeds = [PRIVATE_BUDGET_SEED, bid.key().as_ref()],
        bump = private_budget.bump,
        has_one = campaign,
        has_one = buyer,
        constraint = private_budget.commitment == bid.key() @ CompartidoError::WrongCommitment,
    )]
    pub private_budget: Account<'info, PrivateBudget>,
    /// CHECK: Verified by the Permission Program.
    #[account(
        mut,
        seeds = [PERMISSION_SEED, private_budget.key().as_ref()],
        bump,
        seeds::program = PERMISSION_PROGRAM_ID,
    )]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: Permission program.
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: Ephemeral vault.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: Magic program.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateBid<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    /// CHECK: The delegation program validates the bid PDA and owner.
    #[account(
        mut,
        del,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub bid: UncheckedAccount<'info>,
    /// CHECK: Optional TEE validator checked by the delegation program.
    pub validator: Option<UncheckedAccount<'info>>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct DelegateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: The delegation program validates the campaign PDA and owner.
    #[account(
        mut,
        del,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump
    )]
    pub campaign: UncheckedAccount<'info>,
    /// CHECK: Optional TEE validator checked by the delegation program.
    pub validator: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts)]
pub struct BidPermissionContext<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    pub campaign: Account<'info, Campaign>,
    /// CHECK: Verified by the permission program using its PDA seeds.
    #[account(
        mut,
        seeds = [PERMISSION_SEED, bid.key().as_ref()],
        bump,
        seeds::program = PERMISSION_PROGRAM_ID,
    )]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: Permission program.
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: Ephemeral vault.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: Magic program.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [BID_SEED, campaign.key().as_ref(), bid.buyer.as_ref()],
        bump = bid.bump,
    )]
    pub bid: Account<'info, Bid>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateCampaign<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            CAMPAIGN_SEED,
            campaign.creator.as_ref(),
            &campaign.campaign_id.to_le_bytes()
        ],
        bump = campaign.bump,
        constraint = campaign.creator == payer.key() @ CompartidoError::WrongCreator,
    )]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct PostSupplierOffer<'info> {
    #[account(mut)]
    pub supplier: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = supplier,
        space = SupplierOffer::SPACE,
        seeds = [OFFER_SEED, campaign.key().as_ref(), supplier.key().as_ref()],
        bump
    )]
    pub offer: Account<'info, SupplierOffer>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SelectWinningOffer<'info> {
    pub caller: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct ComputeAllocations<'info> {
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator,
        seeds = [
            CAMPAIGN_SEED,
            creator.key().as_ref(),
            &campaign.campaign_id.to_le_bytes()
        ],
        bump = campaign.bump,
    )]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct SettleCampaign<'info> {
    pub caller: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: Must match the winning supplier stored in the campaign.
    #[account(mut)]
    pub supplier: UncheckedAccount<'info>,
    /// CHECK: Verified by campaign-derived PDA seeds.
    #[account(mut, seeds = [TREASURY_SEED, campaign.key().as_ref()], bump = campaign.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    /// CHECK: Verified by campaign-derived PDA seeds.
    #[account(mut, seeds = [TREASURY_SEED, campaign.key().as_ref()], bump = campaign.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimAccessReceipt<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [BID_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump = bid.bump,
        has_one = campaign,
        has_one = buyer,
    )]
    pub bid: Account<'info, Bid>,
    #[account(
        init,
        payer = buyer,
        space = AccessReceipt::SPACE,
        seeds = [RECEIPT_SEED, campaign.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub receipt: Account<'info, AccessReceipt>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub title: [u8; 32],
    pub target_quantity: u16,
    /// Public per-unit escrow ceiling shared by every participant.
    pub deposit_cap: u64,
    pub deadline: i64,
    pub status: CampaignStatus,
    pub bid_count: u16,
    pub offer_count: u8,
    pub total_requested: u32,
    pub clearing_price: u64,
    pub winning_supplier: Pubkey,
    pub available_quantity: u16,
    pub allocated_quantity: u32,
    pub treasury_bump: u8,
    pub bump: u8,
}

impl Campaign {
    pub const SPACE: usize = 8 + 32 + 8 + 32 + 2 + 8 + 8 + 1 + 2 + 1 + 4 + 8 + 32 + 2 + 4 + 1 + 1;
}

#[account]
pub struct Bid {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub quantity: u16,
    pub deposit: u64,
    pub allocated_quantity: u16,
    pub refund_owed: u64,
    pub allocation_computed: bool,
    pub settled: bool,
    pub refund_claimed: bool,
    pub receipt_claimed: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl Bid {
    pub const SPACE: usize = 8 + 32 + 32 + 2 + 8 + 2 + 8 + 1 + 1 + 1 + 1 + 8 + 1;
}

/// A secret maximum created only inside the Private ER. This account is never
/// committed or undelegated to Solana base state.
#[account]
pub struct PrivateBudget {
    pub campaign: Pubkey,
    pub commitment: Pubkey,
    pub buyer: Pubkey,
    pub max_unit_price: u64,
    pub bump: u8,
}

impl PrivateBudget {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 1;
}

#[account]
pub struct SupplierOffer {
    pub campaign: Pubkey,
    pub supplier: Pubkey,
    pub quantity: u16,
    pub unit_price: u64,
    pub active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl SupplierOffer {
    pub const SPACE: usize = 8 + 32 + 32 + 2 + 8 + 1 + 8 + 1;
}

#[account]
pub struct AccessReceipt {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub supplier: Pubkey,
    pub quantity: u16,
    pub unit_price: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

impl AccessReceipt {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 2 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Open,
    OfferSelected,
    AllocationsComputed,
    Settled,
    Cancelled,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub target_quantity: u16,
    pub deposit_cap: u64,
    pub deadline: i64,
}

#[event]
pub struct AllocationsComputed {
    pub campaign: Pubkey,
    pub allocated_quantity: u32,
}

#[event]
pub struct BidSubmitted {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub quantity: u16,
}

#[event]
pub struct SupplierOfferPosted {
    pub campaign: Pubkey,
    pub supplier: Pubkey,
    pub quantity: u16,
    pub unit_price: u64,
}

#[event]
pub struct WinningOfferSelected {
    pub campaign: Pubkey,
    pub supplier: Pubkey,
    pub quantity: u16,
    pub clearing_price: u64,
}

#[event]
pub struct CampaignSettled {
    pub campaign: Pubkey,
    pub supplier: Pubkey,
    pub allocated_quantity: u32,
    pub clearing_price: u64,
    pub supplier_payout: u64,
}

#[event]
pub struct RefundClaimed {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AccessReceiptClaimed {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub quantity: u16,
    pub unit_price: u64,
}

#[error_code]
pub enum CompartidoError {
    #[msg("The campaign deadline must be in the future")]
    InvalidDeadline,
    #[msg("Quantity must be greater than zero")]
    InvalidQuantity,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("The campaign is not open")]
    CampaignNotOpen,
    #[msg("The campaign is closed")]
    CampaignClosed,
    #[msg("The campaign deadline has not been reached")]
    DeadlineNotReached,
    #[msg("The maximum number of demo bids has been reached")]
    BidLimitReached,
    #[msg("The maximum number of demo offers has been reached")]
    OfferLimitReached,
    #[msg("Supplier quantity does not meet the campaign target")]
    InsufficientSupply,
    #[msg("No supplier offers were posted")]
    NoOffers,
    #[msg("Every supplier offer must be included")]
    IncompleteOfferSet,
    #[msg("Every buyer bid must be included")]
    IncompleteBidSet,
    #[msg("Every public commitment and private budget pair must be included")]
    IncompletePrivateBudgetSet,
    #[msg("An account belongs to another program")]
    InvalidAccountOwner,
    #[msg("The account is not a valid supplier offer")]
    InvalidOfferAccount,
    #[msg("The account is not a valid bid")]
    InvalidBidAccount,
    #[msg("The account is not a valid private budget")]
    InvalidPrivateBudgetAccount,
    #[msg("The account belongs to another campaign")]
    WrongCampaign,
    #[msg("The private budget belongs to another commitment")]
    WrongCommitment,
    #[msg("The private budget belongs to another buyer")]
    WrongBuyer,
    #[msg("The campaign creator is required")]
    WrongCreator,
    #[msg("Duplicate participant account")]
    DuplicateAccount,
    #[msg("The supplier offer is inactive")]
    InactiveOffer,
    #[msg("A winning offer has not been selected")]
    OfferNotSelected,
    #[msg("The supplied payout account is not the winning supplier")]
    WrongSupplier,
    #[msg("The bid was already settled")]
    BidAlreadySettled,
    #[msg("Private allocations have already been computed")]
    AllocationsAlreadyComputed,
    #[msg("Private allocations have not been computed")]
    AllocationsNotComputed,
    #[msg("The remaining bid account must be writable")]
    AccountMustBeWritable,
    #[msg("Escrow accounting invariant failed")]
    EscrowInvariant,
    #[msg("The campaign is not settled")]
    CampaignNotSettled,
    #[msg("The bid is not settled")]
    BidNotSettled,
    #[msg("The refund was already claimed")]
    RefundAlreadyClaimed,
    #[msg("This bid received no allocation")]
    NoAllocation,
    #[msg("The access receipt was already claimed")]
    ReceiptAlreadyClaimed,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn buyer(seed: u8) -> Pubkey {
        Pubkey::new_from_array([seed; 32])
    }

    #[test]
    fn private_outcomes_fill_exact_target_without_revealing_maxima() {
        let deposit = 1_800_000;
        let inputs = vec![
            PrivateAllocationInput {
                buyer: buyer(1),
                quantity: 1,
                private_max: 1_500_000,
                deposit,
            },
            PrivateAllocationInput {
                buyer: buyer(2),
                quantity: 1,
                private_max: 1_300_000,
                deposit,
            },
            PrivateAllocationInput {
                buyer: buyer(3),
                quantity: 1,
                private_max: 900_000,
                deposit,
            },
        ];

        let (allocated, outcomes) = calculate_private_outcomes(&inputs, 2, 1_000_000).unwrap();

        assert_eq!(allocated, 2);
        assert_eq!(
            outcomes
                .iter()
                .map(|outcome| outcome.allocated_quantity)
                .collect::<Vec<_>>(),
            vec![1, 1, 0]
        );
        assert_eq!(
            outcomes
                .iter()
                .map(|outcome| outcome.refund_owed)
                .collect::<Vec<_>>(),
            vec![800_000, 800_000, 1_800_000]
        );
    }

    #[test]
    fn private_outcomes_cancel_partial_group_and_refund_everyone() {
        let inputs = vec![
            PrivateAllocationInput {
                buyer: buyer(1),
                quantity: 1,
                private_max: 1_500_000,
                deposit: 1_800_000,
            },
            PrivateAllocationInput {
                buyer: buyer(2),
                quantity: 1,
                private_max: 900_000,
                deposit: 1_800_000,
            },
        ];

        let (allocated, outcomes) = calculate_private_outcomes(&inputs, 2, 1_000_000).unwrap();

        assert_eq!(allocated, 0);
        assert!(outcomes
            .iter()
            .all(|outcome| outcome.allocated_quantity == 0));
        assert!(outcomes
            .iter()
            .all(|outcome| outcome.refund_owed == 1_800_000));
    }
}
