/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ITaskMetricsService } from '../task_metrics.types';
import type { TelemetryEvent } from '../types';
import type { TaskExecutionPeriod } from '../task';
import { TELEMETRY_CHANNEL_DETECTION_ALERTS, DETECTION_RULE_TYPE_ESQL } from '../constants';
import {
  batchTelemetryRecords,
  processK8sUsernames,
  newTelemetryLogger,
  getPreviousDailyTaskTimestamp,
  safeValue,
  unflatten,
  processDetectionRuleCustomizations,
  withErrorMessage,
} from '../helpers';
import { copyAllowlistedFields, filterList } from '../filterlists';
import type { AllowlistFields } from '../filterlists/types';

export function createTelemetryPrebuiltRuleAlertsTaskConfig(maxTelemetryBatch: number) {
  const taskName = 'Security Solution - Prebuilt Rule and Elastic ML Alerts Telemetry';
  const taskVersion = '1.2.0';
  const taskType = 'security:telemetry-prebuilt-rule-alerts';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '15m',
    version: taskVersion,
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
      const log = newTelemetryLogger(logger.get('prebuilt_rule_alerts'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.debug('Running telemetry task');

      try {
        const [clusterInfoPromise, licenseInfoPromise, packageVersion] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
          receiver.fetchDetectionRulesPackageVersion(),
        ]);

        const clusterInfo = safeValue(clusterInfoPromise);
        const licenseInfo = safeValue(licenseInfoPromise);
        const packageInfo = safeValue(packageVersion, undefined);

        const index = receiver.getAlertsIndex();

        if (index === undefined) {
          log.warn(`alerts index is not ready yet, skipping telemetry task`);
          await taskMetricsService.end(trace);
          return 0;
        }

        const unflattenedFilterList = unflatten<AllowlistFields>(filterList.prebuiltRulesAlerts);
        for await (const alerts of receiver.fetchPrebuiltRuleAlertsBatch(
          index,
          taskExecutionPeriod.last ?? 'now-1h',
          taskExecutionPeriod.current
        )) {
          if (alerts.length === 0) {
            await taskMetricsService.end(trace);
            return 0;
          }

          const processedAlerts = alerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              event['kibana.alert.rule.type'] === DETECTION_RULE_TYPE_ESQL
                ? copyAllowlistedFields(unflattenedFilterList, unflatten<TelemetryEvent>(event))
                : copyAllowlistedFields(filterList.prebuiltRulesAlerts, event)
          );

          const sanitizedAlerts = processedAlerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              processK8sUsernames(clusterInfo?.cluster_uuid, event)
          );

          const enrichedAlerts = sanitizedAlerts.map(
            (event: TelemetryEvent): TelemetryEvent => ({
              ...event,
              licence_id: licenseInfo?.uid,
              cluster_uuid: clusterInfo?.cluster_uuid,
              cluster_name: clusterInfo?.cluster_name,
              package_version: packageInfo?.version,
              task_version: taskVersion,
              customizations: processDetectionRuleCustomizations(event),
            })
          );

          log.debug('sending elastic prebuilt alerts', {
            length: enrichedAlerts.length,
          } as LogMeta);
          const batches = batchTelemetryRecords(enrichedAlerts, maxTelemetryBatch);

          const promises = batches.map(async (batch) => {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_DETECTION_ALERTS, batch);
          });

          await Promise.all(promises);
        }

        await taskMetricsService.end(trace);
        return 0;
      } catch (error) {
        log.error('could not complete task', withErrorMessage(error));
        await taskMetricsService.end(trace, error);
        return 0;
      }
    },
  };
}
