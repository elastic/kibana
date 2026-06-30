/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const SEEDED_ATTACK_TITLE = 'Scout seeded attack discovery';
const SEEDED_SCHEDULE_NAME = 'Scout seeded attack schedule';

const createGenerationUuid = (): string => {
  const webCrypto = globalThis.crypto;
  if (webCrypto !== undefined && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  return `scout-gen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export interface AttackDiscoveryApiService {
  seedAttackData: () => Promise<void>;
  seedAttackSchedule: () => Promise<void>;
  seedAttackInferenceSchedule: (interval?: string) => Promise<{ id: string }>;
}

export const getAttackDiscoveryApiService = ({
  kbnClient,
  log,
  scoutSpace,
  esClient,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
  esClient?: ScoutParallelWorkerFixtures['esClient'];
}): AttackDiscoveryApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';
  const spaceId = scoutSpace?.id ?? 'default';

  return {
    seedAttackData: async () => {
      await measurePerformanceAsync(log, 'security.attackDiscovery.seedAttackData', async () => {
        const findSeededResponse = await kbnClient.request({
          method: 'GET',
          path: `${basePath}/api/attack_discovery/_find`,
          query: {
            per_page: 2,
            search: SEEDED_ATTACK_TITLE,
            scheduled: true,
            shared: true,
          },
        });

        const responseBody = findSeededResponse.data as { total?: unknown };
        const total = typeof responseBody.total === 'number' ? responseBody.total : 0;

        if (total >= 2) {
          return;
        }

        const createResponse = await kbnClient.request({
          method: 'POST',
          path: `${basePath}/internal/elastic_assistant/data_generator/attack_discoveries/_create`,
          headers: {
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'Kibana',
            'elastic-api-version': '1',
          },
          body: {
            alertsContextCount: 2,
            anonymizedAlerts: [],
            apiConfig: {
              connectorId: 'none',
              actionTypeId: 'none',
              model: 'none',
            },
            attackDiscoveries: [
              {
                alertIds: ['seed-alert-1', 'seed-alert-2'],
                detailsMarkdown: 'Seeded by Scout attacks space setup.',
                entitySummaryMarkdown: 'Seeded entity summary',
                mitreAttackTactics: ['Execution', 'Persistence'],
                summaryMarkdown: 'Seeded with synthetic alert IDs',
                title: SEEDED_ATTACK_TITLE,
                timestamp: new Date().toISOString(),
              },
              {
                alertIds: ['seed-alert-3', 'seed-alert-4'],
                detailsMarkdown: 'Seeded by Scout attacks space setup (manual).',
                entitySummaryMarkdown: 'Seeded entity summary (manual)',
                mitreAttackTactics: ['Execution'],
                summaryMarkdown: 'Seeded with synthetic alert IDs (manual)',
                title: `${SEEDED_ATTACK_TITLE} (Manual)`,
                timestamp: new Date().toISOString(),
              },
            ],
            connectorName: 'Synthetic (Scout attacks space setup)',
            enableFieldRendering: true,
            generationUuid: createGenerationUuid(),
            withReplacements: false,
          },
        });

        const responseBodyData = createResponse.data as { data?: unknown[] };
        if (esClient && responseBodyData && Array.isArray(responseBodyData.data)) {
          const createdDocs = responseBodyData.data;
          const manualDoc = createdDocs.find(
            (doc) =>
              typeof doc === 'object' &&
              doc !== null &&
              'title' in doc &&
              (doc as { title?: unknown }).title === `${SEEDED_ATTACK_TITLE} (Manual)`
          ) as { id?: string; index?: string } | undefined;

          const scheduledDoc = createdDocs.find(
            (doc) =>
              typeof doc === 'object' &&
              doc !== null &&
              'title' in doc &&
              (doc as { title?: unknown }).title === SEEDED_ATTACK_TITLE
          ) as { id?: string; index?: string } | undefined;

          if (manualDoc && manualDoc.id && manualDoc.index) {
            // The `_create` API uses a temporary rule to generate the attacks, which overwrites the
            // `alertRuleUuid` with the temporary rule's UUID. To properly simulate a manually generated
            // attack, we must directly update the document in Elasticsearch to restore the ad-hoc sentinel
            // value and user details.
            await esClient.update({
              index: manualDoc.index,
              id: manualDoc.id,
              refresh: true,
              doc: {
                'kibana.alert.rule.uuid': 'attack_discovery_ad_hoc_rule_id',
                'kibana.alert.rule.rule_type_id': 'attack_discovery_ad_hoc_rule_type_id',
                'attack_discovery.user.name': 'scout_user',
                'attack_discovery.user.id': 'scout_user_id',
              },
            });
          }

          if (scheduledDoc && scheduledDoc.id && scheduledDoc.index) {
            // Similarly, update the scheduled doc to have the correct rule type ID
            // so that it is properly recognized as a scheduled attack.
            await esClient.update({
              index: scheduledDoc.index,
              id: scheduledDoc.id,
              refresh: true,
              doc: {
                'kibana.alert.rule.rule_type_id': 'attack-discovery',
              },
            });
          }
        }
      });
    },

    seedAttackSchedule: async () => {
      await measurePerformanceAsync(
        log,
        'security.attackDiscovery.seedAttackSchedule',
        async () => {
          const findSchedulesResponse = await kbnClient.request({
            method: 'GET',
            path: `${basePath}/api/attack_discovery/schedules/_find`,
            query: {
              page: 1,
              per_page: 100,
            },
          });

          const responseBody = findSchedulesResponse.data as { data?: unknown[] };
          const schedules = Array.isArray(responseBody.data) ? responseBody.data : [];
          const hasSeededSchedule = schedules.some(
            (schedule) =>
              typeof schedule === 'object' &&
              schedule !== null &&
              'name' in schedule &&
              (schedule as { name?: unknown }).name === SEEDED_SCHEDULE_NAME
          );

          if (hasSeededSchedule) {
            return;
          }

          await kbnClient.request({
            method: 'POST',
            path: `${basePath}/api/attack_discovery/schedules`,
            headers: {
              'kbn-xsrf': 'true',
              'elastic-api-version': '2023-10-31',
            },
            body: {
              name: SEEDED_SCHEDULE_NAME,
              enabled: false,
              params: {
                alerts_index_pattern: `.alerts-security.alerts-${spaceId}`,
                api_config: {
                  connectorId: 'connector-id',
                  actionTypeId: '.bedrock',
                  model: 'model',
                  name: 'Scout seeded connector',
                  provider: 'OpenAI',
                },
                end: 'now',
                size: 50,
                start: 'now-24h',
              },
              schedule: {
                interval: '24h',
              },
              actions: [],
            },
          });
        }
      );
    },

    seedAttackInferenceSchedule: async (interval: string = '1m') => {
      const scheduleName = 'Scout seeded inference attack schedule';
      return measurePerformanceAsync(
        log,
        'security.attackDiscovery.seedAttackInferenceSchedule',
        async () => {
          const findSchedulesResponse = await kbnClient.request({
            method: 'GET',
            path: `${basePath}/api/attack_discovery/schedules/_find`,
            query: {
              page: 1,
              per_page: 100,
              search: `"${scheduleName}"`,
            },
          });

          const responseBody = findSchedulesResponse.data as { data?: unknown[] };
          const schedules = Array.isArray(responseBody.data) ? responseBody.data : [];
          const existingSchedule = schedules.find(
            (schedule) =>
              typeof schedule === 'object' &&
              schedule !== null &&
              'name' in schedule &&
              (schedule as { name?: unknown }).name === scheduleName
          );

          if (
            existingSchedule &&
            typeof existingSchedule === 'object' &&
            'id' in existingSchedule
          ) {
            return { id: (existingSchedule as { id: string }).id };
          }

          const createResponse = await kbnClient.request({
            method: 'POST',
            path: `${basePath}/api/attack_discovery/schedules`,
            headers: {
              'kbn-xsrf': 'true',
              'elastic-api-version': '2023-10-31',
            },
            ignoreErrors: [400, 500],
            body: {
              name: scheduleName,
              enabled: false,
              params: {
                alerts_index_pattern: `.alerts-security.alerts-${spaceId}`,
                anonymization_fields: [],
                api_config: {
                  connectorId: '.eis-claude-3.7-sonnet',
                  actionTypeId: '.inference',
                  model: 'none',
                  name: 'Scout seeded inference connector',
                  provider: 'Other',
                },
                end: 'now',
                replacements: {},
                size: 50,
                start: 'now-24h',
                subAction: 'invokeAI',
              },
              schedule: {
                interval,
              },
              actions: [],
            },
          });

          if (createResponse.status !== 200) {
            throw new Error(`Failed to create schedule: ${JSON.stringify(createResponse.data)}`);
          }

          return { id: (createResponse.data as { id: string }).id };
        }
      );
    },
  };
};
