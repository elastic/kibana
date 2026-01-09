/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';

const AGENT_ID = oneChatDefaultAgentId;

const securityAuthJobIds = [
  'auth_rare_source_ip_for_a_user',
  'suspicious_login_activity',
  'auth_rare_user',
  'auth_rare_hour_for_a_user',
];
const padJobIds = [
  'pad_linux_rare_process_executed_by_user',
  'pad_linux_high_count_privileged_process_events_by_user',
];
const lmdJobIds = [
  'lmd_high_count_remote_file_transfer',
  'lmd_high_file_size_remote_file_transfer',
];
const securityPacketBeatJobIds = ['packetbeat_rare_server_domain'];
const dedJobIds = [
  'ded_high_bytes_written_to_external_device',
  'ded_high_bytes_written_to_external_device_airdrop',
  'ded_high_sent_bytes_destination_geo_country_iso_code',
  'ded_high_sent_bytes_destination_ip',
];

evaluate.describe('Security Entity Analytics (Skills) - Anomalies', { tag: '@svlSecurity' }, () => {
  evaluate.beforeAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate.afterAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate.describe('without data', () => {
    evaluate(
      'entity analytics anomalies questions (skills) - without data',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: anomalies without data',
            description: 'Anomaly questions validated via OneAgent skills (ML jobs not enabled)',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Which service accounts have unusual access patterns?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${[
                      ...securityAuthJobIds,
                      'v3_windows_anomalous_service',
                    ].join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_search_anomalies".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Are there any rare server domains being contacted?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${securityPacketBeatJobIds.join(
                      ', '
                    )}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Show users logged in from multiple locations' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Are there connections suggesting lateral movement?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${lmdJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Show accounts performing unusual administrative actions' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Which users uploaded data to external domains?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Show unusual access attempts to privileged accounts' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Show me users with suspicious login patterns' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show me entities with anomalous behavior in the last 24 hours',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Show users who downloaded unusually large data' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Which accounts have downloaded more than 1KB this millennium?',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Is anyone accessing sensitive data from new locations?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Are there any unusual access patterns after hours?' },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    'Mention at least 1 job id from the list: auth_rare_hour_for_a_user',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      }
    );
  });

  evaluate.describe('with ML anomalies data', () => {
      evaluate.beforeAll(async ({ esArchiverLoad }) => {
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/security_auth_anomalies'
        );
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/pad_anomalies'
        );
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/lmd_anomalies'
        );
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/packetbeat_anomalies'
        );
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/data_exfiltration_anomalies'
        );
      });

      evaluate(
        'entity analytics anomalies questions (skills) - with data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'entity-analytics-skills: anomalies',
              description:
                'Anomaly queries validated via OneAgent skills (ML anomalies indices present)',
              agentId: AGENT_ID,
              examples: [
                {
                  input: { question: 'Show users logged in from multiple locations' },
                  output: {
                    criteria: [
                      'Mentions anomalies or unusual behavior',
                      'Mentions at least one job id',
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show me rare server domains being contacted' },
                  output: {
                    criteria: [
                      'Mentions anomalies or unusual behavior',
                      `Mentions at least 1 job id from the list: ${securityPacketBeatJobIds.join(
                        ', '
                      )}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Are there connections suggesting lateral movement?' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions lmd_high_count_remote_file_transfer job id`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show accounts performing unusual administrative actions' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${padJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Which users uploaded data to external domains?' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show unusual access attempts to privileged accounts' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${padJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show me users with suspicious login patterns' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: {
                    question: 'Show me entities with anomalous behavior in the last 1000 years',
                  },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show users who downloaded unusually large data' },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: {
                    question: 'Which accounts have downloaded more than 1KB this millennium?',
                  },
                  output: {
                    criteria: [
                      'Mentions anomalies',
                      `Mentions at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Is anyone accessing sensitive data from new locations?' },
                  output: {
                    criteria: ['Mentions anomalies', 'Mentions at least one result or new location'],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Are there any unusual access patterns after hours?' },
                  output: {
                    criteria: ['Mentions anomalies', 'Mentions auth_rare_hour_for_a_user'],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Show me entities with anomalous behavior in the last 24h.' },
                  output: {
                    criteria: ['Mentions an anomaly or anomalous behavior'],
                    toolCalls: [
                      {
                        id: 'invoke_skill',
                        criteria: [
                          'The agent should invoke the skill tool "entity_analytics_search_anomalies".',
                        ],
                      },
                    ],
                  },
                  metadata: { query_intent: 'Factual' },
                },
              ],
            },
          });
        }
      );
    });
});
