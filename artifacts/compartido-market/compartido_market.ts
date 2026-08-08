/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/compartido_market.json`.
 */
export type CompartidoMarket = {
  "address": "E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh",
  "metadata": {
    "name": "compartidoMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Private collaborative demand market built for MagicBlock Solana Blitz v7"
  },
  "instructions": [
    {
      "name": "cancelCampaign",
      "docs": [
        "Base-layer completion of a prepared cancellation. It is available only",
        "to the organizer after the deadline, returns every full deposit, and can",
        "never pay the organizer."
      ],
      "discriminator": [
        66,
        10,
        32,
        138,
        122,
        36,
        134,
        202
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "treasuryToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimAccessReceipt",
      "discriminator": [
        244,
        199,
        188,
        102,
        41,
        62,
        137,
        114
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "bid"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimRefund",
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "bid"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "treasuryToken",
          "writable": true
        },
        {
          "name": "buyerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimRoomAccess",
      "docs": [
        "The wallet that proves knowledge of a one-time link secret receives its",
        "role onchain. The secret is never persisted, only its hash."
      ],
      "discriminator": [
        8,
        111,
        147,
        192,
        156,
        63,
        125,
        241
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "invite",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  105,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "invite.nonce",
                "account": "claimableInvite"
              }
            ]
          }
        },
        {
          "name": "access",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "computeAllocations",
      "docs": [
        "Computes allocations inside the Private ER. Remaining accounts must be",
        "ordered as `(public commitment, ER-only private budget)` pairs. Only the",
        "outcome is written into delegated public state; private maxima stay in",
        "their ER-only accounts and are never committed to Solana."
      ],
      "discriminator": [
        102,
        187,
        208,
        51,
        184,
        75,
        69,
        236
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "campaign.campaign_id",
                "account": "campaign"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createBid",
      "docs": [
        "Creates a public commitment and escrows against the campaign-wide safety",
        "ceiling. A buyer's real maximum never appears in this account."
      ],
      "discriminator": [
        234,
        10,
        213,
        160,
        52,
        26,
        91,
        142
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "access",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "buyerToken",
          "writable": true
        },
        {
          "name": "treasuryToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "quantity",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createClaimableInvite",
      "docs": [
        "Creates a one-time capability link. The recipient's wallet is deliberately",
        "unknown here: it is bound only when the recipient claims the secret."
      ],
      "discriminator": [
        39,
        183,
        41,
        130,
        177,
        188,
        101,
        191
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "invite",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  105,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "permissions",
          "type": "u8"
        },
        {
          "name": "secretHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "delegateBid",
      "discriminator": [
        205,
        246,
        97,
        168,
        93,
        183,
        203,
        117
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "bufferBid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                193,
                153,
                54,
                116,
                162,
                199,
                13,
                13,
                132,
                83,
                57,
                178,
                146,
                170,
                67,
                54,
                229,
                193,
                171,
                44,
                179,
                199,
                145,
                60,
                127,
                247,
                101,
                64,
                51,
                141,
                151,
                26
              ]
            }
          }
        },
        {
          "name": "delegationRecordBid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataBid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegateCampaign",
      "docs": [
        "Delegates the public campaign only after a supplier has been selected so",
        "private allocation can update the aggregate outcome inside the ER."
      ],
      "discriminator": [
        179,
        37,
        210,
        58,
        116,
        38,
        10,
        173
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferCampaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                193,
                153,
                54,
                116,
                162,
                199,
                13,
                13,
                132,
                83,
                57,
                178,
                146,
                170,
                67,
                54,
                229,
                193,
                171,
                44,
                179,
                199,
                145,
                60,
                127,
                247,
                101,
                64,
                51,
                141,
                151,
                26
              ]
            }
          }
        },
        {
          "name": "delegationRecordCampaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataCampaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "campaignId"
              }
            ]
          }
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "campaignId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "grantRoomAccess",
      "docs": [
        "The organizer grants a wallet one explicit role before sharing its invite."
      ],
      "discriminator": [
        177,
        153,
        60,
        19,
        242,
        112,
        23,
        177
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "member"
        },
        {
          "name": "access",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "permissions",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initBidPermission",
      "docs": [
        "Creates a private permission on the ER. Only this buyer can inspect the",
        "bid PDA through the TEE endpoint."
      ],
      "discriminator": [
        36,
        217,
        208,
        192,
        111,
        156,
        135,
        147
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "campaign",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                136,
                161,
                10,
                196,
                33,
                152,
                1,
                214,
                246,
                106,
                29,
                60,
                6,
                152,
                192,
                102,
                169,
                175,
                212,
                217,
                180,
                252,
                231,
                71,
                151,
                141,
                209,
                5,
                168,
                212,
                103,
                82
              ]
            }
          }
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initPrivateBudgetPermission",
      "docs": [
        "Restricts the ER-only budget to its owner and the room organizer. Other",
        "participants can observe aggregate progress but cannot query this account."
      ],
      "discriminator": [
        173,
        129,
        56,
        228,
        23,
        136,
        47,
        228
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "bid",
            "privateBudget"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "bid",
            "privateBudget"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "privateBudget",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  118,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "privateBudget"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                136,
                161,
                10,
                196,
                33,
                152,
                1,
                214,
                246,
                106,
                29,
                60,
                6,
                152,
                192,
                102,
                169,
                175,
                212,
                217,
                180,
                252,
                231,
                71,
                151,
                141,
                209,
                5,
                168,
                212,
                103,
                82
              ]
            }
          }
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeCampaign",
      "discriminator": [
        169,
        88,
        7,
        6,
        9,
        165,
        65,
        132
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "campaignId"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "treasuryToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "campaignId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "targetQuantity",
          "type": "u16"
        },
        {
          "name": "depositCap",
          "type": "u64"
        },
        {
          "name": "minGoal",
          "type": "u64"
        },
        {
          "name": "maxGoal",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "paymentMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "placePrivateBudget",
      "docs": [
        "Creates the secret budget PDA directly inside the Private ER. Unlike a",
        "delegated base-layer account, an `eph` account has no public state to leak."
      ],
      "discriminator": [
        86,
        240,
        107,
        193,
        226,
        232,
        20,
        8
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "bid"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "privateBudget",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  118,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxUnitPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "postSupplierOffer",
      "discriminator": [
        209,
        180,
        242,
        157,
        39,
        153,
        144,
        93
      ],
      "accounts": [
        {
          "name": "supplier",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "access",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "supplier"
              }
            ]
          }
        },
        {
          "name": "offer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "supplier"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "quantity",
          "type": "u16"
        },
        {
          "name": "unitPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "prepareCancellation",
      "docs": [
        "Marks every delegated commitment for a full refund without reading any",
        "private budget. The accounts can then be returned to Solana, where the",
        "token transfers are executed by `cancel_campaign`."
      ],
      "discriminator": [
        71,
        173,
        73,
        33,
        231,
        154,
        33,
        145
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "campaign.campaign_id",
                "account": "campaign"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "selectGoal",
      "docs": [
        "Locks a final group target inside the organizer-approved goal band. The",
        "existing private matcher then checks which invited members can cover the",
        "equal per-person share without exposing their ceilings."
      ],
      "discriminator": [
        180,
        214,
        165,
        192,
        98,
        38,
        141,
        57
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "finalGoal",
          "type": "u64"
        }
      ]
    },
    {
      "name": "selectWinningOffer",
      "docs": [
        "Every offer must be passed, preventing callers from hiding a cheaper supplier."
      ],
      "discriminator": [
        248,
        207,
        93,
        235,
        58,
        5,
        144,
        31
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "setBidPrivacy",
      "discriminator": [
        188,
        202,
        210,
        120,
        62,
        248,
        216,
        164
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "campaign",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                136,
                161,
                10,
                196,
                33,
                152,
                1,
                214,
                246,
                106,
                29,
                60,
                6,
                152,
                192,
                102,
                169,
                175,
                212,
                217,
                180,
                252,
                231,
                71,
                151,
                141,
                209,
                5,
                168,
                212,
                103,
                82
              ]
            }
          }
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "isPrivate",
          "type": "bool"
        }
      ]
    },
    {
      "name": "settleCampaign",
      "docs": [
        "Pays the room organizer from public, committed allocation outcomes."
      ],
      "discriminator": [
        118,
        148,
        120,
        120,
        113,
        252,
        70,
        175
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "supplier",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "treasuryToken",
          "writable": true
        },
        {
          "name": "supplierToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "undelegateBid",
      "discriminator": [
        155,
        154,
        180,
        216,
        45,
        81,
        140,
        53
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "bid.buyer",
                "account": "bid"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "undelegateCampaign",
      "discriminator": [
        104,
        38,
        176,
        37,
        217,
        238,
        54,
        150
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "campaign.creator",
                "account": "campaign"
              },
              {
                "kind": "account",
                "path": "campaign.campaign_id",
                "account": "campaign"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updatePrivateBudget",
      "docs": [
        "Lets a participant revise their secret ceiling before the room closes.",
        "The private account remains inside the TEE and its permission is unchanged."
      ],
      "discriminator": [
        8,
        120,
        80,
        187,
        9,
        166,
        108,
        154
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "bid",
            "privateBudget"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "bid",
            "privateBudget"
          ]
        },
        {
          "name": "bid",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "privateBudget",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  118,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bid"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "maxUnitPrice",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "accessReceipt",
      "discriminator": [
        160,
        208,
        81,
        74,
        140,
        203,
        172,
        176
      ]
    },
    {
      "name": "bid",
      "discriminator": [
        143,
        246,
        48,
        245,
        42,
        145,
        180,
        88
      ]
    },
    {
      "name": "campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "claimableInvite",
      "discriminator": [
        39,
        208,
        82,
        179,
        49,
        131,
        141,
        146
      ]
    },
    {
      "name": "privateBudget",
      "discriminator": [
        177,
        112,
        47,
        62,
        212,
        82,
        166,
        23
      ]
    },
    {
      "name": "roomAccess",
      "discriminator": [
        67,
        109,
        128,
        117,
        156,
        151,
        35,
        99
      ]
    },
    {
      "name": "supplierOffer",
      "discriminator": [
        194,
        47,
        51,
        75,
        97,
        107,
        214,
        32
      ]
    }
  ],
  "events": [
    {
      "name": "accessReceiptClaimed",
      "discriminator": [
        109,
        1,
        76,
        239,
        224,
        144,
        73,
        161
      ]
    },
    {
      "name": "allocationsComputed",
      "discriminator": [
        249,
        168,
        78,
        177,
        171,
        90,
        187,
        150
      ]
    },
    {
      "name": "bidSubmitted",
      "discriminator": [
        116,
        72,
        108,
        240,
        175,
        70,
        56,
        22
      ]
    },
    {
      "name": "campaignCreated",
      "discriminator": [
        9,
        98,
        69,
        61,
        53,
        131,
        64,
        152
      ]
    },
    {
      "name": "campaignSettled",
      "discriminator": [
        117,
        145,
        212,
        210,
        201,
        63,
        135,
        24
      ]
    },
    {
      "name": "refundClaimed",
      "discriminator": [
        136,
        64,
        242,
        99,
        4,
        244,
        208,
        130
      ]
    },
    {
      "name": "supplierOfferPosted",
      "discriminator": [
        106,
        52,
        79,
        25,
        132,
        179,
        60,
        2
      ]
    },
    {
      "name": "winningOfferSelected",
      "discriminator": [
        162,
        30,
        8,
        62,
        196,
        127,
        36,
        45
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidDeadline",
      "msg": "The campaign deadline must be in the future"
    },
    {
      "code": 6001,
      "name": "invalidQuantity",
      "msg": "Quantity must be greater than zero"
    },
    {
      "code": 6002,
      "name": "invalidPrice",
      "msg": "Price must be greater than zero"
    },
    {
      "code": 6003,
      "name": "invalidGoalRange",
      "msg": "Choose a valid minimum and maximum group goal"
    },
    {
      "code": 6004,
      "name": "goalOutsideRange",
      "msg": "The selected amount is outside the approved goal range"
    },
    {
      "code": 6005,
      "name": "goalMustSplitEvenly",
      "msg": "Choose a goal that splits evenly across the required group"
    },
    {
      "code": 6006,
      "name": "invalidAccessRole",
      "msg": "Choose a participant or supplier access role"
    },
    {
      "code": 6007,
      "name": "participantAccessRequired",
      "msg": "This wallet has not been invited as a participant"
    },
    {
      "code": 6008,
      "name": "supplierAccessRequired",
      "msg": "This wallet has not been invited as a supplier"
    },
    {
      "code": 6009,
      "name": "inviteAlreadyClaimed",
      "msg": "This invite link has already been claimed"
    },
    {
      "code": 6010,
      "name": "invalidInviteSecret",
      "msg": "This invite link is invalid"
    },
    {
      "code": 6011,
      "name": "campaignNotOpen",
      "msg": "The campaign is not open"
    },
    {
      "code": 6012,
      "name": "campaignClosed",
      "msg": "The campaign is closed"
    },
    {
      "code": 6013,
      "name": "deadlineNotReached",
      "msg": "The campaign deadline has not been reached"
    },
    {
      "code": 6014,
      "name": "bidLimitReached",
      "msg": "The maximum number of demo bids has been reached"
    },
    {
      "code": 6015,
      "name": "offerLimitReached",
      "msg": "The maximum number of demo offers has been reached"
    },
    {
      "code": 6016,
      "name": "insufficientSupply",
      "msg": "Supplier quantity does not meet the campaign target"
    },
    {
      "code": 6017,
      "name": "noOffers",
      "msg": "No supplier offers were posted"
    },
    {
      "code": 6018,
      "name": "incompleteOfferSet",
      "msg": "Every supplier offer must be included"
    },
    {
      "code": 6019,
      "name": "incompleteBidSet",
      "msg": "Every buyer bid must be included"
    },
    {
      "code": 6020,
      "name": "incompletePrivateBudgetSet",
      "msg": "Every public commitment and private budget pair must be included"
    },
    {
      "code": 6021,
      "name": "invalidAccountOwner",
      "msg": "An account belongs to another program"
    },
    {
      "code": 6022,
      "name": "invalidOfferAccount",
      "msg": "The account is not a valid supplier offer"
    },
    {
      "code": 6023,
      "name": "invalidBidAccount",
      "msg": "The account is not a valid bid"
    },
    {
      "code": 6024,
      "name": "invalidPrivateBudgetAccount",
      "msg": "The account is not a valid private budget"
    },
    {
      "code": 6025,
      "name": "wrongCampaign",
      "msg": "The account belongs to another campaign"
    },
    {
      "code": 6026,
      "name": "wrongCommitment",
      "msg": "The private budget belongs to another commitment"
    },
    {
      "code": 6027,
      "name": "wrongBuyer",
      "msg": "The private budget belongs to another buyer"
    },
    {
      "code": 6028,
      "name": "wrongCreator",
      "msg": "The campaign creator is required"
    },
    {
      "code": 6029,
      "name": "duplicateAccount",
      "msg": "Duplicate participant account"
    },
    {
      "code": 6030,
      "name": "inactiveOffer",
      "msg": "The supplier offer is inactive"
    },
    {
      "code": 6031,
      "name": "offerNotSelected",
      "msg": "A winning offer has not been selected"
    },
    {
      "code": 6032,
      "name": "wrongSupplier",
      "msg": "The supplied payout account is not the winning supplier"
    },
    {
      "code": 6033,
      "name": "bidAlreadySettled",
      "msg": "The bid was already settled"
    },
    {
      "code": 6034,
      "name": "allocationsAlreadyComputed",
      "msg": "Private allocations have already been computed"
    },
    {
      "code": 6035,
      "name": "allocationsNotComputed",
      "msg": "Private allocations have not been computed"
    },
    {
      "code": 6036,
      "name": "accountMustBeWritable",
      "msg": "The remaining bid account must be writable"
    },
    {
      "code": 6037,
      "name": "escrowInvariant",
      "msg": "Escrow accounting invariant failed"
    },
    {
      "code": 6038,
      "name": "campaignNotSettled",
      "msg": "The campaign is not settled"
    },
    {
      "code": 6039,
      "name": "bidNotSettled",
      "msg": "The bid is not settled"
    },
    {
      "code": 6040,
      "name": "refundAlreadyClaimed",
      "msg": "The refund was already claimed"
    },
    {
      "code": 6041,
      "name": "noAllocation",
      "msg": "This bid received no allocation"
    },
    {
      "code": 6042,
      "name": "receiptAlreadyClaimed",
      "msg": "The access receipt was already claimed"
    },
    {
      "code": 6043,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "accessReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "supplier",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "unitPrice",
            "type": "u64"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "accessReceiptClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "unitPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "allocationsComputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "allocatedQuantity",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "deposit",
            "type": "u64"
          },
          {
            "name": "allocatedQuantity",
            "type": "u16"
          },
          {
            "name": "refundOwed",
            "type": "u64"
          },
          {
            "name": "allocationComputed",
            "type": "bool"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "refundClaimed",
            "type": "bool"
          },
          {
            "name": "receiptClaimed",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "campaignId",
            "type": "u64"
          },
          {
            "name": "title",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "targetQuantity",
            "type": "u16"
          },
          {
            "name": "depositCap",
            "docs": [
              "Public per-unit escrow ceiling shared by every participant."
            ],
            "type": "u64"
          },
          {
            "name": "minGoal",
            "type": "u64"
          },
          {
            "name": "maxGoal",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "campaignStatus"
              }
            }
          },
          {
            "name": "bidCount",
            "type": "u16"
          },
          {
            "name": "offerCount",
            "type": "u8"
          },
          {
            "name": "totalRequested",
            "type": "u32"
          },
          {
            "name": "clearingPrice",
            "type": "u64"
          },
          {
            "name": "winningSupplier",
            "type": "pubkey"
          },
          {
            "name": "availableQuantity",
            "type": "u16"
          },
          {
            "name": "allocatedQuantity",
            "type": "u32"
          },
          {
            "name": "treasuryBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "paymentDecimals",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "campaignCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "targetQuantity",
            "type": "u16"
          },
          {
            "name": "depositCap",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "campaignSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "supplier",
            "type": "pubkey"
          },
          {
            "name": "allocatedQuantity",
            "type": "u32"
          },
          {
            "name": "clearingPrice",
            "type": "u64"
          },
          {
            "name": "supplierPayout",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "campaignStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "offerSelected"
          },
          {
            "name": "allocationsComputed"
          },
          {
            "name": "settled"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "claimableInvite",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "permissions",
            "type": "u8"
          },
          {
            "name": "secretHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "privateBudget",
      "docs": [
        "A secret maximum created only inside the Private ER. This account is never",
        "committed or undelegated to Solana base state."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "commitment",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "maxUnitPrice",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "refundClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "roomAccess",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "permissions",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "supplierOffer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "supplier",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "unitPrice",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "supplierOfferPosted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "supplier",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "unitPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "winningOfferSelected",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "supplier",
            "type": "pubkey"
          },
          {
            "name": "quantity",
            "type": "u16"
          },
          {
            "name": "clearingPrice",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
