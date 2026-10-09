/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import {
  bulkIndexEntities,
  createWatchlistEntitySource,
  createSourceIndex,
  createWatchlist,
  deleteEntityEngines,
  deleteSourceIndex,
  deleteWatchlistsByName,
  installEntityStoreV2AndWait,
} from '../../src/setup_helpers';

/**
 * manage-watchlists skill — tool routing evals for the watchlist mutation tools.
 *
 * These specs validate that the `manage-watchlists` skill correctly routes:
 * - create / update / delete a watchlist
 * - add / remove entities by an explicit id list
 * - the create-and-populate headline flow (create_watchlist, which — being HITL-gated —
 *   is the terminal call for that turn; add_entities_to_watchlist would follow in a
 *   subsequent turn once the user confirms and the watchlist id is known)
 * - the query-then-add flow (get_watchlist_id → search_entities → add_entities_to_watchlist)
 * - the data sources flows (set_watchlist_rule_based_data_source, remove_watchlist_rule_based_data_source, list_watchlist_data_sources)
 */

const SEEDED_USER_EUIDS = ['user:jsmith123', 'user:rjones456', 'user:alice', 'user:bob'];
const SEEDED_CRITICAL_USER_EUIDS = ['user:critical-alice', 'user:critical-bob'];
const SEEDED_HOST_EUIDS = ['host:server01'];
const UBUNTU_HOST_EUID = 'host:ubuntu-web-01';
const VPN_SOURCE_INDEX = 'vpn-sessions-eval';

const MANAGED_WATCHLIST_NAMES = [
  // Pre-seeded — exist before tests run
  'Privileged Users',
  'Compromised Accounts',
  // Test-created — created during the run by the create examples. Listed here
  // so cleanup removes them; not re-seeded by beforeAll.
  'Suspicious Logins',
  'High Risk Hosts',
  'Server Fleet',
];

evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Manage Watchlists',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });

      await bulkIndexEntities({
        esClient,
        entities: [
          ...SEEDED_USER_EUIDS.map((euid) => ({ euid })),
          ...SEEDED_CRITICAL_USER_EUIDS.map((euid) => ({
            euid,
            riskLevel: 'Critical' as const,
            riskScoreNorm: 92,
          })),
          ...SEEDED_HOST_EUIDS.map((euid) => ({ euid })),
          {
            euid: UBUNTU_HOST_EUID,
            extraFields: { os: { name: 'Ubuntu 22.04.3 LTS' } },
          },
        ],
      });

      await createSourceIndex({
        esClient,
        index: VPN_SOURCE_INDEX,
        identifierField: 'user.name',
        properties: { event: { properties: { outcome: { type: 'keyword' } } } },
        documents: [
          { user: { name: 'jsmith123' }, event: { outcome: 'failure' } },
          { user: { name: 'rjones456' }, event: { outcome: 'failure' } },
          { user: { name: 'alice' }, event: { outcome: 'success' } },
        ],
      });

      // delete any prior runs' managed watchlists, then create the pre-seeded subset.
      // The lifecycle examples may also create/delete
      // some of these names during the run — that's fine, watchlist names
      // aren't unique and the agent uses the resolved id.
      await deleteWatchlistsByName({ supertest, names: MANAGED_WATCHLIST_NAMES });
      await createWatchlist({
        supertest,
        watchlist: {
          name: 'Privileged Users',
          description: 'Sensitive accounts under continuous review',
          riskModifier: 1.5,
        },
      });
      await createWatchlist({
        supertest,
        watchlist: {
          name: 'Compromised Accounts',
          description: 'Users suspected to be compromised',
          riskModifier: 1,
        },
      });
      await createWatchlist({
        supertest,
        watchlist: {
          name: 'High Risk Hosts',
          description: 'Hosts kept in continuous scope for review',
          riskModifier: 1,
        },
      });
      const serverFleet = await createWatchlist({
        supertest,
        watchlist: {
          name: 'Server Fleet',
          description: 'Server hosts kept in continuous scope',
          riskModifier: 1,
        },
      });
      await createWatchlistEntitySource({
        supertest,
        watchlistId: serverFleet.id,
        source: { name: 'server-fleet-store', queryRule: 'host.os.name: Ubuntu*' },
      });
    });

    evaluate.afterAll(async ({ log, supertest, esClient }) => {
      try {
        await deleteSourceIndex({ esClient, index: VPN_SOURCE_INDEX });
      } catch (err) {
        log.warning(`Source index cleanup failed during teardown: ${(err as Error).message}`);
      }
      // Best-effort cleanup. Failures here are non-fatal — the next beforeAll
      // is idempotent and will clear leftover seeded watchlists by name.
      try {
        await deleteWatchlistsByName({ supertest, names: MANAGED_WATCHLIST_NAMES });
      } catch (err) {
        log.warning(`Watchlist cleanup failed during teardown: ${(err as Error).message}`);
      }
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('manage watchlists: enumerate', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: enumerate watchlists',
          description:
            'Questions that enumerate the watchlists configured in the space route to security.list_watchlists',
          examples: [
            {
              input: {
                question: 'What watchlists do we have configured?',
              },
              output: {
                criteria: [
                  'List the watchlists configured in the current space, including the name and id for each watchlist, or clearly state that no watchlists are configured.',
                  'Include the watchlist description when present.',
                  'Do not fabricate watchlist data.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_watchlists',
                    criteria: [
                      'The tool is called to enumerate watchlists. nameContains should be omitted (the user did not name a specific watchlist).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });

    evaluate('manage watchlists: create / update / delete flows', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: manage watchlists (lifecycle)',
          description:
            'Questions that should route to the watchlist lifecycle tools (create / update / delete) in the manage-watchlists skill',
          examples: [
            {
              input: {
                question:
                  'Create a watchlist called Suspicious Logins for users with unusual login patterns we want to keep an eye on.',
              },
              output: {
                criteria: [
                  'Use security.create_watchlist to create a watchlist named "Suspicious Logins" with a description matching the user\'s context.',
                  'Surface the confirmation step (the tool is HITL-gated) rather than claiming success outright.',
                  'Do not fabricate a watchlist id.',
                ],
                toolCalls: [
                  {
                    id: 'security.create_watchlist',
                    criteria: [
                      'The tool is called with a name parameter exactly matching "Suspicious Logins" and a description summarising the user\'s purpose ("users with unusual login patterns" or equivalent).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Create' },
            },
            {
              input: {
                question:
                  'Make a watchlist called High Risk Hosts and double the risk score for entities on it.',
              },
              output: {
                criteria: [
                  'Use security.create_watchlist with name "High Risk Hosts" and riskModifier 2 (doubling).',
                  'Surface the confirmation step.',
                ],
                toolCalls: [
                  {
                    id: 'security.create_watchlist',
                    criteria: [
                      'The tool is called with name "High Risk Hosts" and riskModifier set to 2 (the discrete value that represents doubling risk scores). riskModifier must be one of the allowed values: 0, 0.5, 1, 1.5, or 2.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Create' },
            },
            {
              input: {
                question: "Rename the Privileged Users watchlist to 'Senior Privileged Users'.",
              },
              output: {
                criteria: [
                  'Resolve the watchlist "Privileged Users" to its id via security.get_watchlist_id first, then call security.update_watchlist with the new name.',
                  'Surface the confirmation step before applying the change.',
                  'Do not fabricate an id.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_watchlist_id',
                    criteria: [
                      'The tool is called with an identifier of "Privileged Users" to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.update_watchlist',
                    criteria: [
                      'The tool is called with the watchlistId resolved from get_watchlist_id and a name parameter of "Senior Privileged Users". No description or riskModifier should be set (the user only asked to rename).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Update' },
            },
            {
              input: {
                question: 'Delete the Compromised Accounts watchlist.',
              },
              output: {
                criteria: [
                  'Resolve "Compromised Accounts" to its id via security.get_watchlist_id, then call security.delete_watchlist.',
                  'Surface the confirmation step and warn the user that the action cannot be undone.',
                  'Do not claim the deletion succeeded without first confirming with the user.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_watchlist_id',
                    criteria: [
                      'The tool is called with an identifier of "Compromised Accounts" to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.delete_watchlist',
                    criteria: [
                      'The tool is called with the watchlistId resolved from get_watchlist_id.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Delete' },
            },
          ],
        },
      });
    });

    evaluate('manage watchlists: add / remove entities flows', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: manage watchlists (entity membership)',
          description:
            'Questions that should route to the add/remove entity tools in the manage-watchlists skill, including the headline create-and-populate and query-then-add flows',
          examples: [
            {
              input: {
                question:
                  'Add user:jsmith123 and user:rjones456 to the Privileged Users watchlist.',
              },
              output: {
                criteria: [
                  'Resolve "Privileged Users" to its id via security.get_watchlist_id, then call security.add_entities_to_watchlist with the resolved id and both entity ids.',
                  'Surface the confirmation step.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_watchlist_id',
                    criteria: [
                      'The tool is called with an identifier of "Privileged Users" to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.add_entities_to_watchlist',
                    criteria: [
                      'The tool is called with the watchlistId resolved from get_watchlist_id, and entityIds containing exactly ["user:jsmith123", "user:rjones456"] (order not significant).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Add Entities' },
            },
            {
              // security.create_watchlist is HITL-gated, so within a single turn the agent
              // must stop and surface that confirmation — it cannot also call
              // security.add_entities_to_watchlist yet, since the watchlist id doesn't exist
              // until the user confirms the create.
              input: {
                question:
                  'Create a watchlist called Suspicious Logins and add user:alice and user:bob to it.',
              },
              output: {
                criteria: [
                  'Call security.create_watchlist with name "Suspicious Logins" (and ideally a brief description summarising the user\'s purpose).',
                  'Surface the confirmation step for the create rather than claiming the watchlist already exists.',
                  'Do not call security.add_entities_to_watchlist yet, and do not claim user:alice/user:bob were already added — the watchlist id is not known until the user confirms the create. In prose, indicate the entities will be added as a follow-up once the watchlist is created.',
                  'Do not fabricate a watchlist id.',
                ],
                toolCalls: [
                  {
                    id: 'security.create_watchlist',
                    criteria: [
                      'The tool is called with name "Suspicious Logins" (and ideally a brief description summarising the user\'s purpose).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Create and Populate' },
            },
            {
              input: {
                question: 'Add all critical-risk users to the Privileged Users watchlist.',
              },
              output: {
                criteria: [
                  'Resolve "Privileged Users" via security.get_watchlist_id, run security.search_entities to find critical-risk users, then call security.add_entities_to_watchlist with the entity ids from the search results.',
                  'Surface the confirmation step before adding.',
                  'In prose, indicate this is a one-time add — if the user wants critical-risk users to keep being added automatically going forward, mention that a standing query can be set up via security.set_watchlist_rule_based_data_source, but do not call that tool for this request.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_watchlist_id',
                    criteria: [
                      'The tool is called with an identifier of "Privileged Users" to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool is called with entityTypes containing "user" and riskLevels containing "Critical" (or equivalent filters) to find the candidate entities.',
                    ],
                  },
                  {
                    id: 'security.add_entities_to_watchlist',
                    criteria: [
                      'The tool is called with the watchlistId from get_watchlist_id and entityIds populated from the entity.id values returned by search_entities (not fabricated).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Query-then-Add' },
            },
            {
              input: {
                question: 'Remove user:jsmith123 from the Privileged Users watchlist.',
              },
              output: {
                criteria: [
                  'Resolve "Privileged Users" via security.get_watchlist_id, then call security.remove_entities_from_watchlist with that id and user:jsmith123.',
                  'Surface the confirmation step. If the entity is reported as not_found with the "Entity not manually assigned" message, the agent should explain that the entity was added via a rule-based entity source rather than manually, and point at security.list_watchlist_data_sources / security.remove_watchlist_rule_based_data_source to inspect or remove that source instead of the UI.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_watchlist_id',
                    criteria: [
                      'The tool is called with an identifier of "Privileged Users" to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.remove_entities_from_watchlist',
                    criteria: [
                      'The tool is called with the watchlistId resolved from get_watchlist_id and entityIds containing exactly ["user:jsmith123"].',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Watchlist Remove Entities' },
            },
          ],
        },
      });
    });

    evaluate(
      'manage watchlists: standing query end-to-end (store source)',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (standing query, store source)',
            description:
              'The Ubuntu example end-to-end: a store-type rule-based source is set via security.set_watchlist_rule_based_data_source, previewed, and surfaced for confirmation.',
            examples: [
              {
                input: {
                  question:
                    'Keep adding Ubuntu hosts to the High Risk Hosts watchlist automatically as they appear, and remove them if they stop matching.',
                },
                output: {
                  criteria: [
                    'Resolve "High Risk Hosts" to its id via security.get_watchlist_id, then call security.set_watchlist_rule_based_data_source with type "store" and a KQL queryRule matching Ubuntu hosts (e.g. host.os.name: Ubuntu* — a wildcard, since exact match on the full OS string would silently match nothing).',
                    'Surface the confirmation step, including the preview of how many hosts currently match.',
                    'Mention that membership will be kept in sync automatically (roughly every 10 minutes) rather than treating this as a one-time add.',
                    'Do not claim the standing query was created without the user confirming.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "High Risk Hosts" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.set_watchlist_rule_based_data_source',
                      criteria: [
                        'The tool is called with the watchlistId resolved from get_watchlist_id, type "store", and a queryRule that targets host.os.name with a wildcard (e.g. Ubuntu*), not an exact-match string.',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Standing Query' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: stop a standing query (remove rule-based source)',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (remove rule-based source)',
            description:
              'Asking to stop an automatic/standing membership rule must route to security.remove_watchlist_rule_based_data_source, not to the manual entity-removal tool or a suggestion to use the UI.',
            examples: [
              {
                input: {
                  question: 'Stop automatically adding Ubuntu hosts to the Server Fleet watchlist.',
                },
                output: {
                  criteria: [
                    'Resolve "Server Fleet" to its id via security.get_watchlist_id, then call security.remove_watchlist_rule_based_data_source with type "store" to remove the standing query.',
                    'Surface the confirmation step rather than claiming the source was removed outright.',
                    'Do not call security.remove_entities_from_watchlist or suggest using the UI — the request is to stop the standing rule itself, not to remove specific entities.',
                    'In prose, it is fine (but not required) to note that hosts already added by this rule are cleaned up on the next sync rather than immediately.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "Server Fleet" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.remove_watchlist_rule_based_data_source',
                      criteria: [
                        'The tool is called with the watchlistId resolved from get_watchlist_id and type "store".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Standing Query Remove' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: one-time named-entity add is not confused with a standing query',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (one-time add regression)',
            description:
              'A one-time, explicitly-named entity add should still route to security.add_entities_to_watchlist and must not be routed to security.set_watchlist_rule_based_data_source, now that both tools exist.',
            examples: [
              {
                input: {
                  question: 'Just this once, add user:jsmith123 to the High Risk Hosts watchlist.',
                },
                output: {
                  criteria: [
                    'Resolve "High Risk Hosts" to its id via security.get_watchlist_id, then call security.add_entities_to_watchlist with that id and the named entity.',
                    'Do not call security.set_watchlist_rule_based_data_source — the user asked for a one-time add of a specific entity, not an ongoing/standing query.',
                    'Surface the confirmation step.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "High Risk Hosts" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.add_entities_to_watchlist',
                      criteria: [
                        'The tool is called with the watchlistId resolved from get_watchlist_id and entityIds containing exactly ["user:jsmith123"].',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Add Entities' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: zero-match standing query surfaces in the confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (zero-match standing query)',
            description:
              'A syntactically valid KQL standing query that currently matches nothing must surface that in the confirmation preview rather than being created silently.',
            examples: [
              {
                input: {
                  question:
                    'Set up a standing query on the High Risk Hosts watchlist for hosts where host.os.name is "Windows Server 2022" exactly.',
                },
                output: {
                  criteria: [
                    'Resolve "High Risk Hosts" via security.get_watchlist_id, then call security.set_watchlist_rule_based_data_source with type "store" and a queryRule matching the user\'s exact-match request.',
                    'Because no seeded host currently has that exact host.os.name value, the tool\'s preview reports zero current matches — the response to the user must surface that zero-match preview (e.g. "this currently matches 0 hosts") rather than silently proceeding or claiming success.',
                    'Ask the user to confirm (or reconsider the query) given the zero-match preview, rather than treating the standing query as already active.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "High Risk Hosts" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.set_watchlist_rule_based_data_source',
                      criteria: [
                        'The tool is called with type "store" and a queryRule reflecting the user\'s exact-match request on host.os.name.',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Standing Query Zero Match' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: index-type standing query when the source is named concretely',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (standing query, index source)',
            description:
              'When the user names the index pattern and the field/value themselves, the agent should build an index-type rule-based source directly, without asking for details it already has.',
            examples: [
              {
                input: {
                  question: `Our VPN logs are in \`${VPN_SOURCE_INDEX}\`, and failed logins there have \`event.outcome\` set to \`failure\`. Keep any user with a failed VPN login on the Compromised Accounts watchlist from now on.`,
                },
                output: {
                  criteria: [
                    'Resolve "Compromised Accounts" to its id via security.get_watchlist_id, then call security.set_watchlist_rule_based_data_source with type "index".',
                    `The indexPattern is ${VPN_SOURCE_INDEX} and the queryRule filters on event.outcome being failure, both taken from the user's own message.`,
                    'identifierField is user.name or user.email — the watchlist tracks users, not hosts or services.',
                    'Do NOT ask the user for the index pattern or the field/value: they supplied both concretely, so asking again is a failure here.',
                    'Surface the confirmation step, including the preview of how many documents currently match, and make clear the preview is a document count rather than a count of entities that will be added.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "Compromised Accounts" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.set_watchlist_rule_based_data_source',
                      criteria: [
                        `The tool is called with type "index", indexPattern "${VPN_SOURCE_INDEX}", an identifierField of user.name or user.email, and a queryRule filtering event.outcome on failure.`,
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Standing Query Index Source' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: asks for specifics instead of guessing a customer-specific index or field',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (ask before guessing)',
            description:
              'A standing-membership request that describes the source and the condition only in human terms must result in the agent asking for the concrete index pattern and field/value, not in a guessed queryRule. A plausible-sounding guess can silently match nothing, and the user may not notice for a long time.',
            examples: [
              {
                input: {
                  question:
                    'People have been pasting internal code into public AI chatbots. We do log that traffic somewhere. Can you make sure anyone who does it keeps showing up on the Compromised Accounts watchlist?',
                },
                output: {
                  criteria: [
                    'Recognize this as a request for ongoing/standing membership rather than a one-time add.',
                    'Do NOT call security.set_watchlist_rule_based_data_source on this turn — neither the index pattern ("we do log that traffic somewhere") nor the condition ("pasting internal code into public AI chatbots") names a concrete index, field, or value, and both are customer-specific with no standard schema to fall back on.',
                    'Do NOT invent an index pattern (e.g. "logs-proxy-*") or a field/value (e.g. destination.domain on a guessed list of AI vendor domains) and present it as if it were the user\'s data.',
                    'Ask the user for the missing specifics — which index pattern holds that traffic, and which field/value identifies it — ideally both in one message rather than over several turns.',
                    'Do not claim that any watchlist or data source was created or updated.',
                  ],
                },
                metadata: { query_intent: 'Watchlist Standing Query Ask First' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'manage watchlists: "data sources" question routes to list_watchlist_data_sources, not search_entities',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: manage watchlists (data sources vs. members)',
            description:
              'A "what are the data sources of X watchlist" question must route to security.list_watchlist_data_sources (manage-watchlists skill), not to the get_watchlist_id → search_entities members flow (entity-analytics skill) — the two questions are superficially similar but ask for different things.',
            examples: [
              {
                input: {
                  question: 'What are the data sources of the High Risk Hosts watchlist?',
                },
                output: {
                  criteria: [
                    'Resolve "High Risk Hosts" to its id via security.get_watchlist_id, then call security.list_watchlist_data_sources with that id.',
                    'Report the entity sources linked to the watchlist (rule-based and/or managed integration), not a list of member entities.',
                    'Do not call security.search_entities for this question — that answers "who is on the watchlist", not "what is adding entities to it".',
                  ],
                  toolCalls: [
                    {
                      id: 'security.get_watchlist_id',
                      criteria: [
                        'The tool is called with an identifier of "High Risk Hosts" to resolve the watchlist id.',
                      ],
                    },
                    {
                      id: 'security.list_watchlist_data_sources',
                      criteria: [
                        'The tool is called with the watchlistId resolved from get_watchlist_id.',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Watchlist Data Sources vs Members' },
              },
            ],
          },
        });
      }
    );
  }
);
