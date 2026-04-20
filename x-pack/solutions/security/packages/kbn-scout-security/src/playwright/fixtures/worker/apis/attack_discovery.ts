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
}

export const getAttackDiscoveryApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
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
            per_page: 1,
            search: SEEDED_ATTACK_TITLE,
            scheduled: true,
            shared: true,
          },
        });

        const responseBody = findSeededResponse.data as { total?: unknown };
        const total = typeof responseBody.total === 'number' ? responseBody.total : 0;

        if (total > 0) {
          return;
        }

        await kbnClient.request({
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
            ],
            connectorName: 'Synthetic (Scout attacks space setup)',
            enableFieldRendering: true,
            generationUuid: createGenerationUuid(),
            withReplacements: false,
          },
        });
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
  };
};
