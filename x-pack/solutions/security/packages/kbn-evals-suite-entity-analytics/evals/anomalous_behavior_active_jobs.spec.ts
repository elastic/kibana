/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { deleteAllRules } from '@kbn/detections-response-ftr-services/rules';
import { DEFAULT_ANOMALY_SCORE } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllAlerts, createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';
import { evaluate } from '../src/evaluate';
import {
  securityAuthModule,
  securityAuthJobIds,
  padModule,
  padJobIds,
  lmdModule,
  lmdJobIds,
  securityPacketBeatModule,
  securityPacketBeatJobIds,
  dedModule,
  dedJobIds,
  deleteMLJobs,
  forceStartDatafeeds,
  installIntegrationAndCreatePolicy,
  setupMlModulesWithRetry,
  waitForAllJobsToStart,
} from '../src/ml_helpers';

evaluate.describe(
  'SIEM ML Jobs Skill - Anomalous Behavior with Active ML Jobs',
  { tag: tags.serverless.security.complete },
  () => {
    const agentPolicyIds: string[] = [];
    const packagePolicyIds: string[] = [];

    // Index pattern that matches all data loaded in tests
    const indexPattern = 'ecs_compliant,auditbeat-*,winlogbeat-*';

    evaluate.beforeAll(async ({ log, esArchiverLoad, supertest, kbnClient }) => {
      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/windows_services'
      );
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/audit_beats/hosts'
      );

      await kbnClient.uiSettings.update({
        [DEFAULT_ANOMALY_SCORE]: 1,
      });

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
      } catch (error) {
        log.warning('Failed to setup Security Auth ML module:', error);
      }

      // Setup PAD ML module (requires Fleet integration)
      try {
        const { agentPolicyId: padAgentPolicyId, packagePolicyId: padPackagePolicyId } =
          await installIntegrationAndCreatePolicy({
            kbnClient,
            supertest,
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
        await forceStartDatafeeds({
          jobIds: dedJobIds,
          rspCode: 200,
          supertest,
        });
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

      await waitForAllJobsToStart({
        supertest,
        jobIds: [
          ...dedJobIds,
          ...securityAuthJobIds,
          ...padJobIds,
          ...lmdJobIds,
          ...securityPacketBeatJobIds,
        ],
        log,
      });
    });

    evaluate.afterAll(async ({ esClient, kbnClient, supertest, log }) => {
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

    evaluate('entity analytics anomalous behavior questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: anomalous behavior with data',
          description: 'Questions to test the SIEM ML Jobs skill - anomalous behavior with data',
          examples: [
            {
              metadata: { query_intent: 'Factual' },
              input: { question: 'Show users logged in from multiple locations' },
              output: {
                criteria: [
                  'Return at least 2 results with log ins from multiple locations',
                  `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${securityAuthJobIds.join(
                        ', '
                      )}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
            },
            {
              metadata: { query_intent: 'Factual' },
              input: { question: 'Are there connections suggesting lateral movement?' },
              output: {
                criteria: [
                  'Return at least 1 results with lateral movement',
                  `Mentions high number of authentication attempts`,
                  `Mentions unusual login activity`,
                  `Mentions unusually high file transfer activity`,
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${lmdJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
            },
            {
              input: {
                question: 'Show accounts performing unusual administrative actions',
              },
              output: {
                criteria: [
                  'Return at least 2 accounts performing unusual administrative actions',
                  'Mentions curl, nc, wget processes',
                  'Mentions privileged commands',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${padJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
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
                  'Return at least 1 result with data uploaded to external domains',
                  'Mentions specific IP addresses or domain names involved in the data exfiltration',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${dedJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
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
                  'Mentions curl, nc, wget processes',
                  'Mentions privileged commands',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${padJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
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
                  'Mentions unusual IP addresses',
                  'Mentions unusual hours of access',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${securityAuthJobIds.join(
                        ', '
                      )}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me entities with anomalous behavior in the last 1000 years', // test data uses fixed timestamps
              },
              output: {
                criteria: [
                  'Return at least 2 entities with anomalous behavior',
                  'Mentions rare IPs',
                  'Mentions rare activity',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${dedJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
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
                  'Mentions high volume of data',
                  'Mentions suspicious exfiltrations',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${dedJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which accounts have downloaded more than 1GB this milleniums?',
              },
              output: {
                criteria: [
                  'Return the accounts that have downloaded more than 1GB this millenium.',
                  'Mentions file transfer',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${dedJobIds.join(', ')}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Is anyone accessing sensitive data from new locations?',
              },
              output: {
                criteria: [
                  'Return the users that are accessing sensitive data from new locations.',
                  'Mentions dormant accounts',
                  'Mentions former employees',
                ],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${securityAuthJobIds.join(
                        ', '
                      )}`,
                      `returns at least 1 index to query`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Are there any unusual access patterns after hours?',
              },
              output: {
                criteria: ['Return at least 1 result with unusual access patterns after hours'],
                toolCalls: [
                  {
                    id: 'security.ml.jobs',
                    criteria: [
                      `returns at least 1 active job id from the list: ${securityAuthJobIds.join(
                        ', '
                      )}`,
                      `returns at least 1 index to query`,
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
  }
);
