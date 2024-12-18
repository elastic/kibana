/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryFilterListArtifact } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { ITaskMetricsService } from '../task_metrics.types';
import type { TaskExecutionPeriod } from '../task';
import { artifactService } from '../artifact';
import { filterList } from '../filterlists';
import { newTelemetryLogger } from '../helpers';

export function createTelemetryFilterListArtifactTaskConfig() {
  const taskName = 'Security Solution Telemetry Filter List Artifact Task';
  const taskType = 'security:telemetry-filterlist-artifact';
  return {
    type: taskType,
    title: taskName,
    interval: '45m',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      _receiver: ITelemetryReceiver,
      _sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('filterlists'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.l('Running telemetry task');

      try {
        const artifactName = 'telemetry-filterlists-v1';
        const manifest = await artifactService.getArtifact(artifactName);
        if (manifest.notModified) {
          log.debug('No new filterlist artifact found, skipping...');
          await taskMetricsService.end(trace);
          return 0;
        }

        const artifact = manifest.data as unknown as TelemetryFilterListArtifact;
        log.l('New filterlist artifact', { artifact });
        filterList.endpointAlerts = artifact.endpoint_alerts;
        filterList.exceptionLists = artifact.exception_lists;
        filterList.prebuiltRulesAlerts = artifact.prebuilt_rules_alerts;
        await taskMetricsService.end(trace);
        return 0;
      } catch (err) {
        log.l('Failed to set telemetry filterlist artifact', { error: err.message });
        filterList.resetAllToDefault();
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
