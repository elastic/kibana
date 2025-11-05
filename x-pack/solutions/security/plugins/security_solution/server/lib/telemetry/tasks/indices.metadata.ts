/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import {
  createUsageCounterLabel,
  getPreviousDailyTaskTimestamp,
  newTelemetryLogger,
} from '../helpers';
import {
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_SETTINGS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
  TELEMETRY_INDEX_TEMPLATES_EVENT,
} from '../event_based/events';
import { telemetryConfiguration } from '../configuration';
import type {
  DataStream,
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndexSettings,
  IndexTemplateInfo,
  IndexTemplatesStats,
  IndicesSettings,
  IndicesStats,
} from '../indices.metadata.types';
import { TelemetryCounter } from '../types';

const COUNTER_LABELS = ['security_solution', 'indices-metadata'];

export function createTelemetryIndicesMetadataTaskConfig() {
  const taskType = 'security:indices-metadata-telemetry';
  return {
    type: taskType,
    title: 'Security Solution Telemetry Indices Metadata task',
    interval: '24h',
    timeout: '5m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('indices-metadata'), mdc);
      const trace = taskMetricsService.start(taskType);

      const taskConfig = telemetryConfiguration.indices_metadata_config;

      const publishDatastreamsStats = (stats: DataStream[]): number => {
        const events: DataStreams = {
          items: stats,
        };
        sender.reportEBT(TELEMETRY_DATA_STREAM_EVENT, events);
        log.info(`Sent data streams`, { count: events.items.length } as LogMeta);
        return events.items.length;
      };

      const publishIndicesStats = async (indices: string[]): Promise<number> => {
        const indicesStats: IndicesStats = {
          items: [],
        };

        for await (const stat of receiver.getIndicesStats(indices, taskConfig.index_query_size)) {
          indicesStats.items.push(stat);
        }
        sender.reportEBT(TELEMETRY_INDEX_STATS_EVENT, indicesStats);
        log.info(`Sent indices stats`, { count: indicesStats.items.length } as LogMeta);
        return indicesStats.items.length;
      };

      const publishIndexTemplatesStats = async (
        indexTemplates: IndexTemplateInfo[]
      ): Promise<number> => {
        const templateStats: IndexTemplatesStats = {
          items: indexTemplates,
        };

        sender.reportEBT(TELEMETRY_INDEX_TEMPLATES_EVENT, templateStats);
        log.info(`Sent index templates`, { count: indexTemplates.length } as LogMeta);

        return templateStats.items.length;
      };

      const publishIndicesSettings = (settings: IndexSettings[]): number => {
        const indicesSettings: IndicesSettings = {
          items: settings,
        };

        sender.reportEBT(TELEMETRY_INDEX_SETTINGS_EVENT, indicesSettings);
        log.info(`Sent indices settings`, { count: indicesSettings.items.length } as LogMeta);
        return indicesSettings.items.length;
      };

      const publishIlmStats = async (indices: string[]): Promise<Set<string>> => {
        const ilmNames = new Set<string>();
        const ilmsStats: IlmsStats = {
          items: [],
        };

        for await (const stat of receiver.getIlmsStats(indices, taskConfig.ilm_stats_query_size)) {
          if (stat.policy_name !== undefined) {
            ilmNames.add(stat.policy_name);
            ilmsStats.items.push(stat);
          }
        }

        sender.reportEBT(TELEMETRY_ILM_STATS_EVENT, ilmsStats);
        log.info(`Sent ILM stats`, { count: ilmNames.size } as LogMeta);

        return ilmNames;
      };

      const publishIlmPolicies = async (ilmNames: Set<string>): Promise<number> => {
        const ilmPolicies: IlmPolicies = {
          items: [],
        };

        for await (const policy of receiver.getIlmsPolicies(
          Array.from(ilmNames.values()),
          taskConfig.ilm_policy_query_size
        )) {
          ilmPolicies.items.push(policy);
        }
        sender.reportEBT(TELEMETRY_ILM_POLICY_EVENT, ilmPolicies);
        log.info('Sent ILM policies', { count: ilmPolicies.items.length } as LogMeta);
        return ilmPolicies.items.length;
      };

      const incrementCounter = (type: TelemetryCounter, name: string, value: number) => {
        const telemetryUsageCounter = sender.getTelemetryUsageCluster();
        telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(COUNTER_LABELS.concat(name)),
          counterType: type,
          incrementBy: value,
        });
      };

      try {
        // 1. Get cluster stats and list of indices and datastreams
        const [indicesSettings, dataStreams, indexTemplates] = await Promise.all([
          receiver.getIndices(),
          receiver.getDataStreams(),
          receiver.getIndexTemplatesStats(),
        ]);

        const indices = indicesSettings.map((index) => index.index_name);

        // 2. Publish datastreams stats
        const dsCount = publishDatastreamsStats(
          dataStreams.slice(0, taskConfig.datastreams_threshold)
        );
        incrementCounter(TelemetryCounter.DOCS_SENT, 'datastreams-stats', dsCount);

        // 3. Publish indices settings
        const indicesSettingsCount = publishIndicesSettings(
          indicesSettings.slice(0, taskConfig.indices_settings_threshold)
        );
        incrementCounter(TelemetryCounter.DOCS_SENT, 'indices-settings', indicesSettingsCount);

        // 4. Get and publish indices stats
        const indicesCount: number = await publishIndicesStats(
          indices.slice(0, taskConfig.indices_threshold)
        )
          .then((count) => {
            incrementCounter(TelemetryCounter.DOCS_SENT, 'indices-stats', count);
            return count;
          })
          .catch((error) => {
            log.warn(`Error getting indices stats`, { error });
            incrementCounter(TelemetryCounter.RUNTIME_ERROR, 'indices-stats', 1);
            return 0;
          });

        // 5. Get ILM stats and publish them
        const ilmNames = await publishIlmStats(indices.slice(0, taskConfig.indices_threshold))
          .then((names) => {
            incrementCounter(TelemetryCounter.DOCS_SENT, 'ilm-stats', names.size);
            return names;
          })
          .catch((error) => {
            log.warn(`Error getting ILM stats`, { error });
            incrementCounter(TelemetryCounter.RUNTIME_ERROR, 'ilm-stats', 1);
            return new Set<string>();
          });

        // 6. Publish ILM policies
        const policyCount = await publishIlmPolicies(ilmNames)
          .then((count) => {
            incrementCounter(TelemetryCounter.DOCS_SENT, 'ilm-policies', count);
            return count;
          })
          .catch((error) => {
            log.warn(`Error getting ILM policies`, { error });
            incrementCounter(TelemetryCounter.RUNTIME_ERROR, 'ilm-policies', 1);
            return 0;
          });

        // 7. Publish index templates
        const indexTemplatesCount: number = await publishIndexTemplatesStats(
          indexTemplates.slice(0, taskConfig.indices_threshold)
        )
          .then((count) => {
            incrementCounter(TelemetryCounter.DOCS_SENT, 'index-templates', count);
            return count;
          })
          .catch((error) => {
            log.warn(`Error getting index templates`, { error });
            incrementCounter(TelemetryCounter.RUNTIME_ERROR, 'index-templates', 1);
            return 0;
          });

        log.info(`Sent EBT events`, {
          datastreams: dsCount,
          indicesSettings: indicesSettingsCount,
          ilms: ilmNames.size,
          indices: indicesCount,
          indexTemplates: indexTemplatesCount,
          policies: policyCount,
        } as LogMeta);

        await taskMetricsService.end(trace);

        return indicesCount;
      } catch (error) {
        log.warn(`Error running indices metadata task`, { error });
        await taskMetricsService.end(trace, error);
        return 0;
      }
    },
  };
}
