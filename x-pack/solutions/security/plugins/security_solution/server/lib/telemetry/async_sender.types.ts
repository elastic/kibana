/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { type IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { type TelemetryChannel } from './types';
import type { ITelemetryReceiver } from './receiver';

/**
 * This service sends telemetry events to the telemetry service asynchronously. Managing
 * different configurations per channel and changing them dynamically without restarting
 * the service is possible.
 */
export interface IAsyncTelemetryEventsSender {
  setup: (
    retryConfig: RetryConfig,
    fallbackQueueConfig: QueueConfig,
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    telemetryUsageCounter?: IUsageCounter
  ) => void;
  start: (telemetryStart?: TelemetryPluginStart) => void;
  stop: () => Promise<void>;
  send: (channel: TelemetryChannel, events: unknown[]) => void;
  simulateSend: (channel: TelemetryChannel, events: unknown[]) => string[];
  updateQueueConfig: (channel: TelemetryChannel, config: QueueConfig) => void;
  updateDefaultQueueConfig: (config: QueueConfig) => void;
}

/**
 * Values used to configure each queue.
 *
 * @property bufferTimeSpanMillis - The time span to buffer events before sending them.
 * @property inflightEventsThreshold - The maximum number of events that can be buffered at the same time, waiting to be sent.
 * @property maxPayloadSizeBytes - The maximum size of the payload sent to the server, in bytes.
 */
export interface QueueConfig {
  bufferTimeSpanMillis: number;
  inflightEventsThreshold: number;
  maxPayloadSizeBytes: number;
}

/**
 * Values used to configure the retry logic.
 *
 * @property retryCount - The number of times to retry  before propagate the error.
 * @property retryDelayMillis - The delay between retries, in milliseconds.
 */
export interface RetryConfig {
  retryCount: number;
  retryDelayMillis: number;
}
