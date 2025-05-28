/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { TELEMETRY_CHANNEL_LISTS } from '../constants';
import {
  batchTelemetryRecords,
  templateResponseActionsCustomRule,
  newTelemetryLogger,
  createUsageCounterLabel,
  safeValue,
} from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { RulesParamsResponseActionsEntry, ResponseActionRules } from '../types';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';

export function createTelemetryCustomResponseActionRulesTaskConfig(maxTelemetryBatch: number) {
  const taskName = 'Security Solution Response Actions Rules Telemetry';
  const taskType = 'security:telemetry-response-actions-rules';
  return {
    type: taskType,
    title: taskName,
    interval: '24h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('response_actions_rules'), mdc);
      const usageCollector = sender.getTelemetryUsageCluster();
      const usageLabelPrefix: string[] = ['security_telemetry', 'response-actions-rules'];
      const trace = taskMetricsService.start(taskType);

      log.l('Running response actions rules telemetry task');

      try {
        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo = safeValue(clusterInfoPromise);
        const licenseInfo = safeValue(licenseInfoPromise);

        const { saved_objects: customRules } = await receiver.fetchResponseActionsRules();

        if (!customRules.length) {
          log.debug('no custom response action rules found');
          await taskMetricsService.end(trace);
          return 0;
        }

        const cacheArray = customRules.reduce<ResponseActionRules[]>((acc, rule) => {
          const ruleId = rule.id;

          const shouldNotProcess =
            rule === null ||
            rule === undefined ||
            ruleId === null ||
            ruleId === undefined ||
            rule.attributes.params.responseActions.length === 0;

          if (shouldNotProcess) {
            return acc;
          }

          acc.push({
            id: ruleId,
            namespaces: rule.namespaces ?? [],
            attributes: {
              consumer: rule.attributes.consumer,
              createdAt: rule.attributes.createdAt,
              name: rule.attributes.name,
              enabled: rule.attributes.enabled,
              immutable: rule.attributes.params.immutable,
              params: {
                responseActions: rule.attributes.params.responseActions,
              },
              tags: rule.attributes.tags,
              updatedAt: rule.attributes.updatedAt,
            },
          });
          return acc;
        }, []);

        const rulesParamsResponseActionsRulesEntries = [] as RulesParamsResponseActionsEntry[];
        for (const item of cacheArray) {
          for (const el of item.attributes.params.responseActions) {
            rulesParamsResponseActionsRulesEntries.push({
              ...el,
            });
          }
        }

        const responseActionsRulesJson = templateResponseActionsCustomRule(
          rulesParamsResponseActionsRulesEntries,
          clusterInfo,
          licenseInfo
        );
        log.l('Custom response actions rule json length', {
          length: responseActionsRulesJson.length,
        });

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelPrefix),
          counterType: 'response_actions_rules_count',
          incrementBy: responseActionsRulesJson.length,
        });

        const batches = batchTelemetryRecords(
          cloneDeep(responseActionsRulesJson),
          maxTelemetryBatch
        );
        for (const batch of batches) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
        }
        await taskMetricsService.end(trace);

        log.l('Task executed', { length: responseActionsRulesJson.length });

        return responseActionsRulesJson.length;
      } catch (err) {
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
