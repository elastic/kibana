/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewRouteHelpersFactory } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { DEFAULT_ANOMALY_SCORE } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllRules } from '@kbn/detections-response-ftr-services/rules';
import { deleteAllAlerts, createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';
import {
  setupMlModulesWithRetry,
  forceStartDatafeeds,
  installIntegrationAndCreatePolicy,
  deleteMLJobs,
} from '../src/helpers/ml';
import { evaluate } from '../src/evaluate';

evaluate.describe(
  'SIEM Entity Analytics Agent - ML Security Prompts Tests',
  { tag: '@svlSecurity' },
  () => {
    // Security Authentication ML module
    const securityAuthModule = 'security_auth';
    const securityAuthJobIds = [
      'auth_rare_source_ip_for_a_user',
      'suspicious_login_activity',
      'auth_rare_user',
      'auth_high_count_logon_events',
    ];

    // Privileged Access Detection (PAD) ML module
    const padModule = 'pad-ml';
    const padJobIds = [
      'pad_linux_rare_process_executed_by_user',
      'pad_linux_high_count_privileged_process_events_by_user',
    ];

    // Lateral Movement Detection (LMD) ML module
    const lmdModule = 'lmd-ml';
    const lmdJobIds = [
      'lmd_high_count_remote_file_transfer',
      'lmd_high_file_size_remote_file_transfer', // TODO: can we delete this one?
    ];

    // Security PacketBeat ML module
    const securityPacketBeatModule = 'security_packetbeat';
    const securityPacketBeatJobIds = ['packetbeat_rare_server_domain'];

    // Data Exfiltration Detection (DED) ML module
    const dedModule = 'ded-ml';
    const dedJobIds = [
      'ded_high_bytes_written_to_external_device',
      'ded_high_bytes_written_to_external_device_airdrop',
      'ded_high_sent_bytes_destination_geo_country_iso_code',
      'ded_high_sent_bytes_destination_ip',
    ];

    const agentPolicyIds: string[] = [];
    const packagePolicyIds: string[] = [];

    // Index pattern that matches all data loaded in tests
    const indexPattern = 'ecs_compliant,auditbeat-*,winlogbeat-*';

    evaluate.beforeAll(async ({ log, esArchiverLoad, supertest }) => {
      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/windows_services'
      );
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution', indexPattern);
    });

    evaluate.afterAll(async ({ kbnClient, supertest }) => {
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.delete('security-solution');
      await kbnClient.savedObjects.cleanStandardList();
    });

    evaluate.describe('without data', () => {
      evaluate(
        'service accounts unusual access patterns without data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'entity-analytics: anomalies without data',
              description:
                'Questions to test the SIEM Entity Analytics agent - service accounts unusual access patterns without data',
              examples: [
                {
                  input: {
                    question: 'Which service accounts have unusual access patterns?',
                  },
                  output: {
                    criteria: [
                      'Return that the required anomaly detection jobs are not enabled in this environment.',
                      'Prompt the user to enable anomaly detection jobs',
                      `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                    ],
                  },
                  metadata: { query_intent: 'Factual' },
                },
              ],
            },
          });
        }
      );

      evaluate(
        'privileged accounts unusual command patterns without data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'entity-analytics: privileged-accounts-unusual-command-patterns-without-data',
              description:
                'Questions to test the SIEM Entity Analytics agent - privileged accounts unusual command patterns without data',
              examples: [
                {
                  input: {
                    question: 'Are there privileged accounts with unusual command patterns?',
                  },
                  output: {
                    criteria: [
                      'Return that the required anomaly detection jobs are not enabled in this environment.',
                      'Prompt the user to enable anomaly detection jobs',
                      `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                    ],
                  },
                  metadata: { query_intent: 'Factual' },
                },
              ],
            },
          });
        }
      );

      evaluate('users multiple locations without data', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics: users-multiple-locations-without-data',
            description:
              'Questions to test the SIEM Entity Analytics agent - users logged in from multiple locations without data',
            examples: [
              {
                input: {
                  question: 'Show users logged in from multiple locations',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${securityAuthJobIds[0]}`,
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      });

      evaluate('lateral movement without data', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics: lateral-movement-without-data',
            description:
              'Questions to test the SIEM Entity Analytics agent - lateral movement without data',
            examples: [
              {
                input: {
                  question: 'Are there connections suggesting lateral movement?',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${lmdJobIds.join(', ')}`,
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      });

      evaluate('entity analytics anomalies questions', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics:anomalies without data',
            description:
              'Questions to test the SIEM Entity Analytics agent - anomalies without data',
            examples: [
              {
                input: {
                  question: 'Show me entities with anomalous behavior in the last 24 hours',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show users who downloaded unusually large data',
                },
                output: {
                  criteria: [
                    'Return that the required anomaly detection jobs are not enabled in this environment.',
                    'Prompt the user to enable anomaly detection jobs',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      });
    });

    evaluate.describe('with ML anomalies data', () => {
      evaluate.beforeAll(async ({ log, esArchiverLoad, supertest, kbnClient, config }) => {
        await kbnClient.uiSettings.update({
          [DEFAULT_ANOMALY_SCORE]: 1,
        });

        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/audit_beats/hosts'
        );

        // Setup Security Authentication ML module (built-in, no Fleet integration needed)
        try {
          const authMlModules = await setupMlModulesWithRetry({
            module: securityAuthModule,
            supertest,
            indexPatternName: indexPattern,
          });
          log.debug(
            'Setup Security Auth ML modules response: ',
            JSON.stringify(authMlModules, null, 2)
          );
          await forceStartDatafeeds({ jobIds: securityAuthJobIds, rspCode: 200, supertest });
          // await waitForJobsToBeStarted({ jobIds: securityAuthJobIds, supertest, log });
        } catch (error) {
          log.warning('Failed to setup Security Auth ML module:', error);
        }

        // Setup PAD ML module (requires Fleet integration)
        try {
          const { agentPolicyId: padAgentPolicyId, packagePolicyId: padPackagePolicyId } =
            await installIntegrationAndCreatePolicy({
              kbnClient,
              supertest,
              log,
              integrationName: 'pad',
            });
          agentPolicyIds.push(padAgentPolicyId);
          packagePolicyIds.push(padPackagePolicyId);

          const padMlModules = await setupMlModulesWithRetry({
            module: padModule,
            supertest,
            indexPatternName: indexPattern,
          });
          log.debug('Setup PAD ML modules response: ', JSON.stringify(padMlModules, null, 2));
          await forceStartDatafeeds({ jobIds: padJobIds, rspCode: 200, supertest });
        } catch (error) {
          log.warning('Failed to setup PAD ML module:', error);
        }

        // Setup LMD ML module (requires Fleet integration)
        try {
          const { agentPolicyId: lmdAgentPolicyId, packagePolicyId: lmdPackagePolicyId } =
            await installIntegrationAndCreatePolicy({
              kbnClient,
              supertest,
              log,
              integrationName: 'lmd',
            });
          agentPolicyIds.push(lmdAgentPolicyId);
          packagePolicyIds.push(lmdPackagePolicyId);

          const lmdMlModules = await setupMlModulesWithRetry({
            module: lmdModule,
            supertest,
            indexPatternName: indexPattern,
          });
          log.debug('Setup LMD ML modules response: ', JSON.stringify(lmdMlModules, null, 2));
          await forceStartDatafeeds({ jobIds: lmdJobIds, rspCode: 200, supertest });
        } catch (error) {
          log.warning('Failed to setup LMD ML module:', error);
        }

        // Setup Security PacketBeat ML module (built-in, no Fleet integration needed)
        try {
          const packetbeatMlModules = await setupMlModulesWithRetry({
            module: securityPacketBeatModule,
            supertest,
            indexPatternName: indexPattern,
          });
          log.debug(
            'Setup Security Packetbeat ML modules response: ',
            JSON.stringify(packetbeatMlModules, null, 2)
          );
          await forceStartDatafeeds({
            jobIds: securityPacketBeatJobIds,
            rspCode: 200,
            supertest,
          });
        } catch (error) {
          log.warning('Failed to setup Security Packetbeat ML module:', error);
        }

        // Setup DED ML module (requires Fleet integration)
        try {
          const { agentPolicyId: dedAgentPolicyId, packagePolicyId: dedPackagePolicyId } =
            await installIntegrationAndCreatePolicy({
              kbnClient,
              supertest,
              log,
              integrationName: 'ded',
            });
          agentPolicyIds.push(dedAgentPolicyId);
          packagePolicyIds.push(dedPackagePolicyId);

          const dedMlModules = await setupMlModulesWithRetry({
            module: dedModule,
            supertest,
            indexPatternName: indexPattern,
          });
          log.debug('Setup DED ML modules response: ', JSON.stringify(dedMlModules, null, 2));
          await forceStartDatafeeds({ jobIds: dedJobIds, rspCode: 200, supertest });
        } catch (error) {
          log.warning('Failed to setup DED ML module:', error);
        }

        // Load anomaly data
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

      evaluate.afterAll(async ({ quickApiClient, supertest, kbnClient, log, esClient }) => {
        // Cleanup agent policies
        for (const agentPolicyId of agentPolicyIds) {
          try {
            await supertest
              .post(`/api/fleet/agent_policies/delete`)
              .set('kbn-xsrf', 'xxxx')
              .send({ agentPolicyId });
          } catch (error) {
            log.warning('Failed to delete agent policy:', error);
          }
        }

        // Cleanup package policies
        for (const packagePolicyId of packagePolicyIds) {
          try {
            await supertest
              .post(`/api/fleet/package_policies/delete`)
              .set('kbn-xsrf', 'xxxx')
              .send({ packagePolicyIds: [packagePolicyId] });
          } catch (error) {
            log.warning('Failed to delete package policy:', error);
          }
        }

        // Cleanup ML jobs
        await deleteMLJobs({
          jobIds: [
            ...securityAuthJobIds,
            ...padJobIds,
            ...lmdJobIds,
            ...securityPacketBeatJobIds,
            ...dedJobIds,
          ],
          supertest,
        });
        await deleteAllAlerts(supertest, log, esClient);
        await deleteAllRules(supertest, log);
        await kbnClient.uiSettings.update({
          [DEFAULT_ANOMALY_SCORE]: 50,
        });
      });

      evaluate('entity analytics anomalies questions', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics: anomalies',
            description: 'Questions to test the SIEM Entity Analytics agent - anomalies',
            examples: [
              // Flaky test, it needs v3_windows_anomalous_service enabled to work
              // {
              //   input: {
              //     question: 'Which service accounts have unusual access patterns?',
              //   },
              //   output: {
              //     criteria: [
              //       'Return at least 1 result with unusual access patterns',
              //       `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
              //     ],
              //     toolCalls: [
              //       {
              //         id: 'entity-analytics-tool',
              //       },
              //     ],
              //   },
              //   metadata: { query_intent: 'Factual' },
              // },

              // Broken: Azure OpenAI's content management policy blocks this question
              // Error calling connector: Status code: 400. Message: API Error: Bad Request - The response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766
              // {
              //   input: {
              //     question: 'Are there privileged accounts with unusual command patterns?',
              //   },
              //   output: {
              //     criteria: [
              //       'Return privileged accounts with unusual command patterns',
              //       `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
              //     ],
              //     toolCalls: [
              //       {
              //         id: 'entity-analytics-tool',
              //       },
              //     ],
              //   },
              //   metadata: { query_intent: 'Factual' },
              // },
              {
                input: {
                  question: 'Show users logged in from multiple locations',
                },
                output: {
                  criteria: [
                    'Return at least 2 results with loggings in multiple locations',
                    `Mention at least 1 job id from the list: ${securityAuthJobIds[0]}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                      criteria: [`returns an ESQL query for the ".ml-anomalies-*" index`],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Are there connections suggesting lateral movement?',
                },
                output: {
                  criteria: [
                    'Return at least 1 results with lateral movement',
                    `Mention lmd_high_count_remote_file_transfer job id`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show accounts performing unusual administrative actions',
                },
                output: {
                  criteria: [
                    'Return at least 2 accounts performing unusual administrative actions',
                    `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Which users uploaded data to external domains?',
                },
                output: {
                  criteria: [
                    'Return at least 2 results with data uploaded to external domains',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show unusual access attempts to privileged accounts',
                },
                output: {
                  criteria: [
                    'Return at least 2 unusual access attempts to privileged accounts',
                    `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show me users with suspicious login patterns',
                },
                output: {
                  criteria: [
                    'Return at least 2 results with suspicious login patterns',
                    `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show me entities with anomalous behavior in the last 1000 years', // it suppose to be 24h, but mocked anomalies timestamp are hardcoded
                },
                output: {
                  criteria: [
                    'Return at least 4 entities with anomalous behavior',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Show users who downloaded unusually large data',
                },
                output: {
                  criteria: [
                    'Return the users who downloaded unusually large data.',
                    `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                  ],
                  toolCalls: [
                    {
                      id: 'entity-analytics-tool',
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      });
    });
  }
);
