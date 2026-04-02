/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ITelemetryEventsSender } from './sender';
import { TelemetryChannel, type TelemetryEvent } from './types';
import type { ITelemetryReceiver } from './receiver';
import type { QueueConfig } from './async_sender.types';

/**
 * Preview telemetry events sender for the telemetry route.
 * @see telemetry_detection_rules_preview_route
 */
export class PreviewTelemetryEventsSender implements ITelemetryEventsSender {
  /** Inner composite telemetry events sender */
  private composite: ITelemetryEventsSender;

  /** Last sent message */
  private sentMessages: string[] = [];

  /** Last sent EBT events */
  private ebtEventsSent: Array<{ eventType: string; eventData: object }> = [];

  constructor(_logger: Logger, composite: ITelemetryEventsSender) {
    this.composite = composite;
  }

  public getSentMessages() {
    return this.sentMessages;
  }

  public getEbtEventsSent(): Array<{ eventType: string; eventData: object }> {
    return this.ebtEventsSent;
  }

  public setup(
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    return this.composite.setup(
      telemetryReceiver,
      telemetrySetup,
      taskManager,
      telemetryUsageCounter
    );
  }

  public getClusterID(): string | undefined {
    return this.composite.getClusterID();
  }

  public start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ): void {
    return this.composite.start(telemetryStart, taskManager, receiver);
  }

  public stop(): void {
    return this.composite.stop();
  }

  public async queueTelemetryEvents(events: TelemetryEvent[]) {
    const result = this.composite.simulateSendAsync(TelemetryChannel.ENDPOINT_ALERTS, events);

    this.sentMessages = [...this.sentMessages, ...result];
  }

  public getTelemetryUsageCluster(): UsageCounter | undefined {
    return this.composite.getTelemetryUsageCluster();
  }

  public isTelemetryOptedIn(): Promise<boolean> {
    return this.composite.isTelemetryOptedIn();
  }

  public isTelemetryServicesReachable(): Promise<boolean> {
    return this.composite.isTelemetryServicesReachable();
  }

  public sendIfDue(): Promise<void> {
    return this.composite.sendIfDue();
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return this.composite.processEvents(events);
  }

  public async sendOnDemand(channel: string, toSend: unknown[]) {
    const ch = Object.values(TelemetryChannel).find((c) => c === channel);
    if (ch === undefined) {
      throw new Error(`Channel ${channel} not found`);
    }
    const result = this.composite.simulateSendAsync(ch, toSend);

    this.sentMessages = [...this.sentMessages, ...result];

    return Promise.resolve();
  }

  public getV3UrlFromV2(v2url: string, channel: string): string {
    return this.composite.getV3UrlFromV2(v2url, channel);
  }

  public sendAsync(channel: TelemetryChannel, events: unknown[]): void {
    const result = this.composite.simulateSendAsync(channel, events);
    this.sentMessages = [...this.sentMessages, ...result];
  }

  public simulateSendAsync(channel: TelemetryChannel, events: unknown[]): string[] {
    const result = this.composite.simulateSendAsync(channel, events);
    this.sentMessages = [...this.sentMessages, ...result];
    return result;
  }

  public updateQueueConfig(channel: TelemetryChannel, config: QueueConfig): void {
    this.composite.updateQueueConfig(channel, config);
  }

  public updateDefaultQueueConfig(config: QueueConfig): void {
    this.composite.updateDefaultQueueConfig(config);
  }

  public reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    this.ebtEventsSent.push({
      eventType: eventTypeOpts.eventType,
      eventData: eventData as object,
    });
    this.composite.reportEBT(eventTypeOpts, eventData);
  }
}
