/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import { TelemetryChannel, type TelemetryConfiguration } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { artifactService } from '../artifact';
import { telemetryConfiguration } from '../configuration';
import { newTelemetryLogger, withErrorMessage } from '../helpers';

export function createTelemetryConfigurationTaskConfig() {
  const taskName = 'Security Solution Telemetry Configuration Task';
  const taskType = 'security:telemetry-configuration';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      _receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('configuration'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.debug('Running telemetry task');

      try {
        const artifactName = 'telemetry-buffer-and-batch-sizes-v1';
        const manifest = await artifactService.getArtifact(artifactName);

        if (manifest.notModified) {
          log.debug('No new configuration artifact found, skipping...');
          await taskMetricsService.end(trace);
          return 0;
        }

        const configArtifact = manifest.data as unknown as TelemetryConfiguration;

        log.debug('Got telemetry configuration artifact', {
          artifact: configArtifact ?? '<null>',
        } as LogMeta);

        telemetryConfiguration.max_detection_alerts_batch =
          configArtifact.max_detection_alerts_batch;
        telemetryConfiguration.telemetry_max_buffer_size = configArtifact.telemetry_max_buffer_size;
        telemetryConfiguration.max_detection_rule_telemetry_batch =
          configArtifact.max_detection_rule_telemetry_batch;
        telemetryConfiguration.max_endpoint_telemetry_batch =
          configArtifact.max_endpoint_telemetry_batch;
        telemetryConfiguration.max_security_list_telemetry_batch =
          configArtifact.max_security_list_telemetry_batch;

        if (configArtifact.use_async_sender) {
          telemetryConfiguration.use_async_sender = configArtifact.use_async_sender;
        }

        if (configArtifact.sender_channels) {
          log.info('Updating sender channels configuration');
          telemetryConfiguration.sender_channels = configArtifact.sender_channels;
          const channelsDict = Object.values(TelemetryChannel).reduce(
            (acc, channel) => acc.set(channel as string, channel),
            new Map<string, TelemetryChannel>()
          );

          Object.entries(configArtifact.sender_channels).forEach(([channelName, config]) => {
            if (channelName === 'default') {
              log.debug('Updating default configuration');
              sender.updateDefaultQueueConfig({
                bufferTimeSpanMillis: config.buffer_time_span_millis,
                inflightEventsThreshold: config.inflight_events_threshold,
                maxPayloadSizeBytes: config.max_payload_size_bytes,
              });
            } else {
              const channel = channelsDict.get(channelName);
              if (!channel) {
                log.info('Ignoring unknown channel', { channel: channelName } as LogMeta);
              } else {
                log.debug('Updating configuration for channel', {
                  channel: channelName,
                } as LogMeta);
                sender.updateQueueConfig(channel, {
                  bufferTimeSpanMillis: config.buffer_time_span_millis,
                  inflightEventsThreshold: config.inflight_events_threshold,
                  maxPayloadSizeBytes: config.max_payload_size_bytes,
                });
              }
            }
          });
        }

        if (configArtifact.pagination_config) {
          log.debug('Updating pagination configuration');
          telemetryConfiguration.pagination_config = configArtifact.pagination_config;
          _receiver.setMaxPageSizeBytes(configArtifact.pagination_config.max_page_size_bytes);
          _receiver.setNumDocsToSample(configArtifact.pagination_config.num_docs_to_sample);
        }

        if (configArtifact.indices_metadata_config) {
          log.debug('Updating indices metadata configuration');
          telemetryConfiguration.indices_metadata_config = configArtifact.indices_metadata_config;
        }

        if (configArtifact.ingest_pipelines_stats_config) {
          log.debug('Updating ingest pipelines stats configuration');
          telemetryConfiguration.ingest_pipelines_stats_config =
            configArtifact.ingest_pipelines_stats_config;
        }

        if (configArtifact.health_diagnostic_config) {
          log.debug('Updating health diagnostic configuration');
          telemetryConfiguration.health_diagnostic_config = {
            ...telemetryConfiguration.health_diagnostic_config,
            ...configArtifact.health_diagnostic_config,
          };
        }

        if (configArtifact.query_config) {
          log.debug('Updating query configuration');
          telemetryConfiguration.query_config = configArtifact.query_config;
        }

        if (configArtifact.encryption_public_keys) {
          log.debug('Updating encryption public keys');
          telemetryConfiguration.encryption_public_keys = configArtifact.encryption_public_keys;
        }

        await taskMetricsService.end(trace);

        log.debug('Updated TelemetryConfiguration');
        return 0;
      } catch (error) {
        log.warn('Failed to set telemetry configuration', withErrorMessage(error));
        telemetryConfiguration.resetAllToDefault();
        await taskMetricsService.end(trace, error);
        return 0;
      }
    },
  };
}
