/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { waitForEndpointPackage } from '../../src/data_generators/endpoint_data';
import { seedForensicTimeline } from '../../src/data_generators/forensic_data';
import { cleanupForensicData } from '../../src/data_generators/cleanup';

/**
 * Slice 2 Osquery tool sequences (minimum-sufficient per golden-dataset reconciliation).
 *
 * FR-012 capability detection: check_integration is the first step before any Osquery
 *   path. If Osquery is not installed, the agent falls back to ES|QL.
 * FR-013 packs: list_packs replaces list_saved_queries when the analyst references a pack.
 * FR-004 saved queries: list_saved_queries -> run_live_query.
 * FR-005 custom queries: list_saved_queries -> get_table_schema -> run_live_query.
 */
const OSQUERY_CHECK_INTEGRATION = 'osquery.check_integration' as const;
const OSQUERY_LIST_SAVED_QUERIES = 'osquery.list_saved_queries' as const;
const OSQUERY_LIST_PACKS = 'osquery.list_packs' as const;
const OSQUERY_GET_TABLE_SCHEMA = 'osquery.get_table_schema' as const;
const OSQUERY_RUN_LIVE_QUERY = 'osquery.run_live_query' as const;
const PLATFORM_GENERATE_ESQL = 'platform.core.generate_esql' as const;
const PLATFORM_EXECUTE_ESQL = 'platform.core.execute_esql' as const;

evaluate.describe(
  'Endpoint Forensic Analysis — slice 2 Osquery smoke',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(
      async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
        await waitForEndpointPackage(kbnClient, esClient, log);
        await cleanupForensicData({ esClient, internalEsClient });
        await seedForensicTimeline({ esClient }, log);

        try {
          await agentBuilderClient.converse({
            agentId: agentBuilderDefaultAgentId,
            input: 'hello',
          });
        } catch (e) {
          log.warning(`Warmup failed: ${e}`);
        }
      }
    );

    evaluate.afterAll(async ({ esClient, internalEsClient }) => {
      await cleanupForensicData({ esClient, internalEsClient });
    });

    evaluate(
      'capability detection — Osquery not installed, falls back to ES|QL',
      async ({ evaluateForensicDataset }) => {
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-slice2-capability-no-osquery',
            description:
              'Slice 2: agent checks Osquery integration, finds it NOT installed, routes to ES|QL fallback.',
            examples: [
              {
                input: {
                  question:
                    'Show me all processes on WKSTN-RECV01 that have open sockets to external IPs — use whatever data source is available.',
                },
                output: {
                  criteria: [
                    'Checks whether Osquery integration is available before attempting an Osquery query',
                    'Routes to ES|QL / Defend telemetry when Osquery is not installed (graceful degradation)',
                    'Does NOT attempt osquery.run_live_query when the integration is absent',
                    'Returns a structured answer with the data source it actually used cited',
                  ],
                  tool_sequence: [
                    OSQUERY_CHECK_INTEGRATION,
                    PLATFORM_GENERATE_ESQL,
                    PLATFORM_EXECUTE_ESQL,
                  ],
                },
                metadata: {
                  golden_id: 'ef-016-capability-no-osquery-fallback',
                  row_type: 'happy',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'capability detection — both installed, Osquery preferred for live state',
      async ({ evaluateForensicDataset }) => {
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-slice2-capability-both-installed',
            description:
              'Slice 2: agent detects both Defend + Osquery, uses Osquery for live-state question.',
            examples: [
              {
                input: {
                  question:
                    'Which processes on WKSTN-RECV01 currently have open sockets to non-RFC1918 addresses? I want live state, not historical telemetry.',
                },
                output: {
                  criteria: [
                    'Checks Osquery integration availability and finds it installed',
                    'Routes to Osquery (not ES|QL) for a live-state question',
                    'Uses process_open_sockets or equivalent read-only Osquery table',
                    'Filters non-private (non-RFC1918) IP ranges in the query',
                    'Returns live-state answer with timestamp',
                  ],
                  tool_sequence: [
                    OSQUERY_CHECK_INTEGRATION,
                    OSQUERY_LIST_SAVED_QUERIES,
                    OSQUERY_GET_TABLE_SCHEMA,
                    OSQUERY_RUN_LIVE_QUERY,
                  ],
                },
                metadata: {
                  golden_id: 'ef-017-capability-both-installed-osquery-preferred',
                  row_type: 'happy',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'Osquery pack with analyst-scope filters applied',
      async ({ evaluateForensicDataset }) => {
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-slice2-pack-with-filters',
            description:
              'Slice 2: agent uses Elastic-built Osquery packs with analyst-scope filters applied.',
            examples: [
              {
                input: {
                  question:
                    'Run the Elastic Windows persistence pack on WKSTN-RECV01 but only show results for the finance user session.',
                },
                output: {
                  criteria: [
                    'Lists available Osquery packs and finds the matching Elastic-built pack',
                    'Applies analyst-scope filter (finance user / specific host) to the pack query',
                    'Returns filtered pack results with pack name/id and query text cited',
                    'Read-only path — no mutation or shell execution',
                  ],
                  tool_sequence: [
                    OSQUERY_CHECK_INTEGRATION,
                    OSQUERY_LIST_PACKS,
                    OSQUERY_RUN_LIVE_QUERY,
                  ],
                },
                metadata: {
                  golden_id: 'ef-018-pack-query-with-filters',
                  row_type: 'happy',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'saved query match — scheduled tasks via Osquery',
      async ({ evaluateForensicDataset }) => {
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-slice2-saved-query-scheduled-tasks',
            description:
              'Slice 2: agent uses prebuilt saved query when it matches the investigative need.',
            examples: [
              {
                input: {
                  question:
                    'Run Osquery on WKSTN-RECV01 to list all scheduled tasks and flag suspicious persistence mechanisms.',
                },
                output: {
                  criteria: [
                    'Uses a prebuilt saved query from osquery_manager when an exact match exists',
                    'Read-only Osquery only — no shell execution or mutating tables',
                    'Returns structured findings with query name/id cited',
                  ],
                  tool_sequence: [
                    OSQUERY_CHECK_INTEGRATION,
                    OSQUERY_LIST_SAVED_QUERIES,
                    OSQUERY_RUN_LIVE_QUERY,
                  ],
                },
                metadata: {
                  golden_id: 'ef-010-osquery-saved-scheduled-tasks',
                  row_type: 'happy',
                },
              },
            ],
          },
        });
      }
    );

    evaluate('custom read-only Osquery — unsigned DLLs', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-slice2-custom-unsigned-dll',
          description: 'Slice 2: agent authors custom read-only Osquery when no prebuilt matches.',
          examples: [
            {
              input: {
                question:
                  'Are there any unsigned DLLs loaded by processes running under the finance user session on WKSTN-RECV01?',
              },
              output: {
                criteria: [
                  'Authors a custom read-only Osquery query (processes, authenticode, etc.)',
                  'Does not use Osquery tables that execute commands or mutate state',
                  'Surfaces query text and host id in the response',
                ],
                tool_sequence: [
                  OSQUERY_CHECK_INTEGRATION,
                  OSQUERY_LIST_SAVED_QUERIES,
                  OSQUERY_GET_TABLE_SCHEMA,
                  OSQUERY_RUN_LIVE_QUERY,
                ],
              },
              metadata: {
                golden_id: 'ef-011-osquery-custom-unsigned-dll',
                row_type: 'happy',
              },
            },
          ],
        },
      });
    });
  }
);
