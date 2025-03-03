/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  EventTypeOpts,
  Logger,
} from '@kbn/core/server';

export interface ITelemetrySender {
  start(analytics: AnalyticsServiceStart): Promise<void>;
  reportEBT: <T>(eventTypeOpts: EventTypeOpts<T>, eventData: T) => void;
}

export class TelemetrySender implements ITelemetrySender {
  private readonly logger: Logger;
  private analytics?: AnalyticsServiceSetup;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async start(analytics: AnalyticsServiceSetup) {
    this.logger.info('Starting telemetry sender');
    this.analytics = analytics;
  }

  public reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    if (!this.analytics) {
      throw Error('analytics is unavailable');
    }
    this.logger.info(`Reporting event: ${eventTypeOpts.eventType}`);
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }
}
