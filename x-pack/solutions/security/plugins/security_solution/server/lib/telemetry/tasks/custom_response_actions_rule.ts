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
  responseActionsCustomRuleTelemetryData,
  newTelemetryLogger,
  createUsageCounterLabel,
  safeValue,
} from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ResponseActionRules, ResponseActionsRuleResponseAggregations } from '../types';
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
      const usageLabelEndpointPrefix: string[] = [
        'security_telemetry',
        'endpoint-response-actions-rules',
      ];
      const usageLabelOsqueryPrefix: string[] = [
        'security_telemetry',
        'osquery-response-actions-rules',
      ];
      const trace = taskMetricsService.start(taskType);

      log.l('Running response actions rules telemetry task');

      try {
        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo = safeValue(clusterInfoPromise);
        const licenseInfo = safeValue(licenseInfoPromise);

        const {
          body: { aggregations },
        } = (await receiver.fetchResponseActionsRules()) ?? {};

        if (!aggregations || !aggregations.actionTypes) {
          log.debug('no custom response action rules found');
          await taskMetricsService.end(trace);
          return 0;
        }

        const responseActionRules = (
          aggregations as unknown as ResponseActionsRuleResponseAggregations
        ).actionTypes.buckets.reduce<ResponseActionRules>((acc, agg) => {
          if (agg.key === '.endpoint') {
            acc.endpoint = agg.rulesInfo.buckets.map((rule) => rule.key);
          } else if (agg.key === '.osquery') {
            acc.osquery = agg.rulesInfo.buckets.map((rule) => rule.key);
          }
          return acc;
        }, {} as ResponseActionRules);

        const shouldNotProcessTelemetry =
          responseActionRules.endpoint === undefined ||
          responseActionRules.osquery === undefined ||
          responseActionRules.endpoint.length === 0 ||
          responseActionRules.osquery.length === 0;

        if (shouldNotProcessTelemetry) {
          return 0;
        }

        const responseActionsRulesTelemetryData = responseActionsCustomRuleTelemetryData(
          responseActionRules,
          clusterInfo,
          licenseInfo
        );

        log.l('Custom response actions rules data', {
          data: JSON.stringify(responseActionsRulesTelemetryData),
        });

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelEndpointPrefix),
          counterType: 'response_actions_rules_count',
          incrementBy: responseActionsRulesTelemetryData.response_actions.endpoint.count,
        });

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelOsqueryPrefix),
          counterType: 'response_actions_rules_count',
          incrementBy: responseActionsRulesTelemetryData.response_actions.osquery.count,
        });

        const batches = batchTelemetryRecords(
          cloneDeep(Object.values(responseActionsRulesTelemetryData)),
          maxTelemetryBatch
        );

        for (const batch of batches) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
        }
        await taskMetricsService.end(trace);

        const totalCount = Object.values(responseActionsRulesTelemetryData.response_actions)
          .map((r) => r.count)
          .reduce((a, b) => a + b, 0);
        log.l('Response actions rules telemetry task executed', {
          totalCount,
        });

        return totalCount;
      } catch (err) {
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
