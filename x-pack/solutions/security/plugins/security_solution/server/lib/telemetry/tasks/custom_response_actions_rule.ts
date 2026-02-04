/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { LogMeta, Logger } from '@kbn/core/server';
import {
  batchTelemetryRecords,
  responseActionsCustomRuleTelemetryData,
  newTelemetryLogger,
  createUsageCounterLabel,
  safeValue,
  withErrorMessage,
} from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import {
  TelemetryChannel,
  type ResponseActionRules,
  type ResponseActionsRuleResponseAggregations,
} from '../types';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { telemetryConfiguration } from '../configuration';

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
      const usageLabelEndpointPrefix: string[] = [
        'security_telemetry',
        'endpoint-response-actions-rules',
      ];
      const usageLabelOsqueryPrefix: string[] = [
        'security_telemetry',
        'osquery-response-actions-rules',
      ];
      const trace = taskMetricsService.start(taskType);

      log.debug('Running response actions rules telemetry task');

      try {
        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo = safeValue(clusterInfoPromise);
        const licenseInfo = safeValue(licenseInfoPromise);

        const {
          body: { aggregations },
        } = await receiver.fetchResponseActionsRules(
          taskExecutionPeriod.last ?? 'now-24h',
          taskExecutionPeriod.current
        );

        if (!aggregations || !aggregations.actionTypes) {
          log.debug('no custom response action rules found');
          await taskMetricsService.end(trace);
          return 0;
        }

        const responseActionRules = (
          aggregations as unknown as ResponseActionsRuleResponseAggregations
        ).actionTypes.buckets.reduce<ResponseActionRules>(
          (acc, agg) => {
            if (agg.key === '.endpoint') {
              acc.endpoint = agg.doc_count;
            } else if (agg.key === '.osquery') {
              acc.osquery = agg.doc_count;
            }
            return acc;
          },
          { endpoint: 0, osquery: 0 }
        );

        const shouldNotProcessTelemetry =
          responseActionRules.endpoint === 0 || responseActionRules.osquery === 0;

        if (shouldNotProcessTelemetry) {
          log.debug('no new custom response action rules found');
          await taskMetricsService.end(trace);
          return 0;
        }

        const responseActionsRulesTelemetryData = responseActionsCustomRuleTelemetryData(
          responseActionRules,
          clusterInfo,
          licenseInfo
        );

        log.debug('Custom response actions rules data', {
          data: JSON.stringify(responseActionsRulesTelemetryData),
        } as LogMeta);

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelEndpointPrefix),
          counterType: 'response_actions_endpoint_rules_count',
          incrementBy: responseActionsRulesTelemetryData.response_actions_rules.endpoint,
        });

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelOsqueryPrefix),
          counterType: 'response_actions_osquery_rules_count',
          incrementBy: responseActionsRulesTelemetryData.response_actions_rules.osquery,
        });

        const documents = cloneDeep(Object.values(responseActionsRulesTelemetryData));

        if (telemetryConfiguration.use_async_sender) {
          sender.sendAsync(TelemetryChannel.LISTS, documents);
        } else {
          const batches = batchTelemetryRecords(documents, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TelemetryChannel.LISTS, batch);
          }
        }

        await taskMetricsService.end(trace);

        const totalCount = Object.values(
          responseActionsRulesTelemetryData.response_actions_rules
        ).reduce((acc, count) => acc + count, 0);

        log.debug('Response actions rules telemetry task executed', {
          totalCount,
        } as LogMeta);

        return totalCount;
      } catch (error) {
        log.warn('Error running custom response actions rule task', withErrorMessage(error));
        await taskMetricsService.end(trace, error);
        return 0;
      }
    },
  };
}
