/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import {
  createWatchlist,
  deleteEntityEngines,
  deleteWatchlistsByName,
  installEntityStoreV2AndWait,
} from '../../src/setup_helpers';

/**
 * UI-guided navigation evals.
 *
 * Entity Analytics operations that are intentionally NOT performed in chat
 * are handled by pointing the user to the right place in the UI. The agent:
 *
 *   1. Declines to perform the operation — it calls NO mutating tool and emits
 *      no attachment claiming the operation succeeded.
 *   2. Calls the `security.entity_analytics_ui_link` tool with the matching
 *      `intent` (+ params) and renders the returned `url` as a markdown link.
 *   3. Explains in one short sentence why the operation lives in the UI.
 */

const MANAGEMENT_BASE_PATH = '/app/security/entity_analytics_management';
const RISK_SCORE_TAB_PATH = `${MANAGEMENT_BASE_PATH}/risk_score`;
const ASSET_CRITICALITY_TAB_PATH = `${MANAGEMENT_BASE_PATH}/asset_criticality`;
const ENTITY_RESOLUTION_TAB_PATH = `${MANAGEMENT_BASE_PATH}/entity_resolution`;
const STATUS_TAB_PATH = `${MANAGEMENT_BASE_PATH}/status`;
const WATCHLISTS_TAB_PATH = `${MANAGEMENT_BASE_PATH}/watchlists`;

const LINK_TOOL_ID = 'security.entity_analytics_ui_link';

const MANAGED_WATCHLIST_NAMES = ['Privileged Users', 'High Risk Hosts'];

evaluate.describe(
  'SIEM Entity Analytics V2 - UI-guided navigation',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });

      // Seed watchlists so `security.entity_analytics_ui_link` (intent watchlist_edit)
      // can resolve the watchlist name the user gives to a real id.
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
          name: 'High Risk Hosts',
          description: 'Production hosts requiring elevated monitoring',
          riskModifier: 2,
        },
      });
    });

    evaluate.afterAll(async ({ log, supertest, quickApiClient }) => {
      try {
        await deleteWatchlistsByName({ supertest, names: MANAGED_WATCHLIST_NAMES });
      } catch (err) {
        log.warning(`Watchlist cleanup failed during teardown: ${(err as Error).message}`);
      }
      await deleteEntityEngines({ quickApiClient, log });
    });

    evaluate(
      'entity analytics enable/disable & clear-data intents redirect to the management page',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — entity analytics settings',
            description:
              'Enabling/disabling Entity Analytics and clearing all entity data are global controls at the top of the management page — the agent redirects there (bare management page, no tab subpath) via security.entity_analytics_ui_link with intent entity_analytics_settings.',
            examples: [
              {
                input: { question: 'Disable Entity Analytics.' },
                output: {
                  criteria: [
                    'The agent declines to disable Entity Analytics from chat and calls NO mutating tool.',
                    `The reply contains a clickable markdown link whose path ends with \`${MANAGEMENT_BASE_PATH}\` (the bare management page, with no tab subpath such as /risk_score).`,
                    'The reply explains in one short sentence that enabling/disabling Entity Analytics is a control on the management page.',
                    'The reply does not prompt for HITL confirmation (building a link is not a mutation).',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: [
                        "The tool is called with intent 'entity_analytics_settings' to build the management-page link.",
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav EA Enablement' },
              },
              {
                input: { question: 'Clear all entity data.' },
                output: {
                  criteria: [
                    'The agent declines to clear entity data from chat and calls NO mutating tool.',
                    `The reply links to a path ending with \`${MANAGEMENT_BASE_PATH}\` (bare management page).`,
                    'The reply flags that clearing all entity data is a destructive control on the management page.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'entity_analytics_settings'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav EA Clear Data' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'risk engine — scoring config & re-score intents redirect to the Risk Score tab',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — risk engine',
            description:
              'Risk-scoring configuration and re-score-now intents redirect to the Risk Score management tab via security.entity_analytics_ui_link with intent risk_engine_settings.',
            examples: [
              {
                input: { question: 'Change the alert filters used by risk scoring.' },
                output: {
                  criteria: [
                    'The agent declines and calls NO tool that mutates risk engine configuration.',
                    `The reply links to a path ending with \`${RISK_SCORE_TAB_PATH}\`.`,
                    'The reply explains that risk-scoring configuration is done on the Risk Score page.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'risk_engine_settings'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Risk Engine Config' },
              },
              {
                input: { question: 'Re-score all entities now.' },
                output: {
                  criteria: [
                    'The agent does not itself run a re-score and calls NO mutating tool.',
                    `The reply links to a path ending with \`${RISK_SCORE_TAB_PATH}\` and mentions the Run button to trigger a re-score.`,
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'risk_engine_settings'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Risk Engine Re-score' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'asset criticality — bulk / CSV intents redirect to the Asset Criticality tab',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — asset criticality bulk',
            description:
              'Asset criticality bulk / CSV upload intents redirect to the Asset Criticality management tab via security.entity_analytics_ui_link with intent asset_criticality_bulk.',
            examples: [
              {
                input: { question: 'Upload this CSV of asset criticalities.' },
                output: {
                  criteria: [
                    'The agent declines to import the CSV from chat and calls NO mutating tool.',
                    `The reply links to a path ending with \`${ASSET_CRITICALITY_TAB_PATH}\`.`,
                    'The reply explains that CSV upload runs through the Asset Criticality page.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'asset_criticality_bulk'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Asset Criticality Bulk CSV' },
              },
              {
                input: {
                  question: 'Bulk-import criticality for these 200 hosts from a spreadsheet.',
                },
                output: {
                  criteria: [
                    'The agent declines to run the bulk import from chat and calls NO mutating tool.',
                    `The reply links to a path ending with \`${ASSET_CRITICALITY_TAB_PATH}\`.`,
                    'The reply explains that bulk criticality changes are done on the management page.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'asset_criticality_bulk'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Asset Criticality Bulk Import' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'entity resolution — bulk CSV intent redirects to the Entity Resolution tab',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — entity resolution bulk',
            description:
              'Bulk-linking entities to resolution targets via a CSV import redirects to the Entity Resolution management tab via security.entity_analytics_ui_link with intent entity_resolution_bulk. (Single-entity resolution opens a per-entity flyout and is not covered here.)',
            examples: [
              {
                input: {
                  question: 'Bulk-link a CSV of entities to their resolution targets.',
                },
                output: {
                  criteria: [
                    'The agent declines to run the bulk resolution import from chat and calls NO mutating tool.',
                    `The reply links to a path ending with \`${ENTITY_RESOLUTION_TAB_PATH}\`.`,
                    'The reply explains that bulk resolution linking runs through a CSV import on the Entity Resolution page.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'entity_resolution_bulk'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Entity Resolution Bulk CSV' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'entity store status intent redirects to the Status tab',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — engine status',
            description:
              'Entity store / engine status questions redirect to the Status management tab via security.entity_analytics_ui_link with intent engine_status.',
            examples: [
              {
                input: { question: 'Show me the status of the entity store engines.' },
                output: {
                  criteria: [
                    'The agent points the user to the status page rather than fabricating status.',
                    `The reply contains a clickable markdown link whose path ends with \`${STATUS_TAB_PATH}\`.`,
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'engine_status'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Engine Status' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'watchlists — UI-only edit intents redirect to the per-watchlist edit flyout',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: UI navigation — watchlist edit flyout',
            description:
              'Watchlist CSV upload and entity-source configuration live in the watchlist edit flyout. The agent passes the watchlist name straight to security.entity_analytics_ui_link (intent watchlist_edit) — the tool resolves the name to an id and builds the deep-link, so the agent does NOT need to call security.list_watchlists first, and must NOT call any mutating watchlist tool.',
            examples: [
              {
                input: {
                  question: 'Upload a CSV of members to the Privileged Users watchlist.',
                },
                output: {
                  criteria: [
                    'The agent declines to upload the CSV in chat and calls NO mutating watchlist tool (no create, update, delete, add_entities, or remove_entities).',
                    `The reply contains a clickable markdown link to the Privileged Users watchlist's edit flyout: the URL path ends with \`${WATCHLISTS_TAB_PATH}\` and carries a \`flyout=\` query parameter opening the watchlists-flyout in edit mode.`,
                    'The reply explains in one short sentence that CSV upload runs through the watchlist editor.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: [
                        "The tool is called with intent 'watchlist_edit' and the watchlist reference 'Privileged Users' (by name); the tool resolves the id.",
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Watchlist CSV Upload' },
              },
              {
                input: {
                  question: 'Configure the entity source for the High Risk Hosts watchlist.',
                },
                output: {
                  criteria: [
                    'The agent declines to configure the entity source in chat and calls NO mutating watchlist tool.',
                    `The reply contains a clickable markdown link to the High Risk Hosts watchlist's edit flyout: the URL path ends with \`${WATCHLISTS_TAB_PATH}\` and carries a \`flyout=\` query parameter in edit mode.`,
                    'The reply explains that the persistent entity source is configured in the editor, not by the chat tools (which only do one-time add/remove).',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: [
                        "The tool is called with intent 'watchlist_edit' and the watchlist reference 'High Risk Hosts'.",
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Watchlist Entity Source' },
              },
              {
                input: {
                  question: 'Open the watchlists page so I can pick one to edit.',
                },
                output: {
                  criteria: [
                    'The agent calls NO mutating watchlist tool.',
                    `The reply contains a clickable markdown link whose path ends with \`${WATCHLISTS_TAB_PATH}\` (the bare Watchlists tab, with no flyout deep-link).`,
                    'The reply tells the user to pick the watchlist from the list in the UI.',
                  ],
                  toolCalls: [
                    {
                      id: LINK_TOOL_ID,
                      criteria: ["The tool is called with intent 'watchlists_list'."],
                    },
                  ],
                },
                metadata: { query_intent: 'Nav Watchlist Bare Tab' },
              },
            ],
          },
        });
      }
    );
  }
);
