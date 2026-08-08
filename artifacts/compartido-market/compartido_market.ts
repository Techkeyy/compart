/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/compartido_market.json`.
 */
export type CompartidoMarket = {
  "address": "9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs",
  "metadata": {
    "name": "compartidoMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Private collaborative demand market built for MagicBlock Solana Blitz v7"
  },
  "instructions": [
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
                128,
                160,
                26,
                216,
                164,
                85,
                48,
                104,
                105,
                125,
                91,
                220,
                54,
                90,
                146,
                238,
                54,
                191,
                155,
                202,
                72,
                18,
                247,
                210,
                146,
                243,
                166,
                22,
                200,
                90,
                61,
                198
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
          "address": "9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs"
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
                128,
                160,
                26,
                216,
                164,
                85,
                48,
                104,
                105,
                125,
                91,
                220,
                54,
                90,
                146,
                238,
                54,
                191,
                155,
                202,
                72,
                18,
                247,
                210,
                146,
                243,
                166,
                22,
                200,
                90,
                61,
                198
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
          "address": "9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs"
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
          "name": "deadline",
          "type": "i64"
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
        "Pays the selected supplier from public, committed allocation outcomes."
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "campaignNotOpen",
      "msg": "The campaign is not open"
    },
    {
      "code": 6004,
      "name": "campaignClosed",
      "msg": "The campaign is closed"
    },
    {
      "code": 6005,
      "name": "deadlineNotReached",
      "msg": "The campaign deadline has not been reached"
    },
    {
      "code": 6006,
      "name": "bidLimitReached",
      "msg": "The maximum number of demo bids has been reached"
    },
    {
      "code": 6007,
      "name": "offerLimitReached",
      "msg": "The maximum number of demo offers has been reached"
    },
    {
      "code": 6008,
      "name": "insufficientSupply",
      "msg": "Supplier quantity does not meet the campaign target"
    },
    {
      "code": 6009,
      "name": "noOffers",
      "msg": "No supplier offers were posted"
    },
    {
      "code": 6010,
      "name": "incompleteOfferSet",
      "msg": "Every supplier offer must be included"
    },
    {
      "code": 6011,
      "name": "incompleteBidSet",
      "msg": "Every buyer bid must be included"
    },
    {
      "code": 6012,
      "name": "incompletePrivateBudgetSet",
      "msg": "Every public commitment and private budget pair must be included"
    },
    {
      "code": 6013,
      "name": "invalidAccountOwner",
      "msg": "An account belongs to another program"
    },
    {
      "code": 6014,
      "name": "invalidOfferAccount",
      "msg": "The account is not a valid supplier offer"
    },
    {
      "code": 6015,
      "name": "invalidBidAccount",
      "msg": "The account is not a valid bid"
    },
    {
      "code": 6016,
      "name": "invalidPrivateBudgetAccount",
      "msg": "The account is not a valid private budget"
    },
    {
      "code": 6017,
      "name": "wrongCampaign",
      "msg": "The account belongs to another campaign"
    },
    {
      "code": 6018,
      "name": "wrongCommitment",
      "msg": "The private budget belongs to another commitment"
    },
    {
      "code": 6019,
      "name": "wrongBuyer",
      "msg": "The private budget belongs to another buyer"
    },
    {
      "code": 6020,
      "name": "wrongCreator",
      "msg": "The campaign creator is required"
    },
    {
      "code": 6021,
      "name": "duplicateAccount",
      "msg": "Duplicate participant account"
    },
    {
      "code": 6022,
      "name": "inactiveOffer",
      "msg": "The supplier offer is inactive"
    },
    {
      "code": 6023,
      "name": "offerNotSelected",
      "msg": "A winning offer has not been selected"
    },
    {
      "code": 6024,
      "name": "wrongSupplier",
      "msg": "The supplied payout account is not the winning supplier"
    },
    {
      "code": 6025,
      "name": "bidAlreadySettled",
      "msg": "The bid was already settled"
    },
    {
      "code": 6026,
      "name": "allocationsAlreadyComputed",
      "msg": "Private allocations have already been computed"
    },
    {
      "code": 6027,
      "name": "allocationsNotComputed",
      "msg": "Private allocations have not been computed"
    },
    {
      "code": 6028,
      "name": "accountMustBeWritable",
      "msg": "The remaining bid account must be writable"
    },
    {
      "code": 6029,
      "name": "escrowInvariant",
      "msg": "Escrow accounting invariant failed"
    },
    {
      "code": 6030,
      "name": "campaignNotSettled",
      "msg": "The campaign is not settled"
    },
    {
      "code": 6031,
      "name": "bidNotSettled",
      "msg": "The bid is not settled"
    },
    {
      "code": 6032,
      "name": "refundAlreadyClaimed",
      "msg": "The refund was already claimed"
    },
    {
      "code": 6033,
      "name": "noAllocation",
      "msg": "This bid received no allocation"
    },
    {
      "code": 6034,
      "name": "receiptAlreadyClaimed",
      "msg": "The access receipt was already claimed"
    },
    {
      "code": 6035,
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
