/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { SloEbtEventMap, SloEbtEventType } from './ebt_event_types';
import type { EventOrigin } from './event_origin';

export interface SloTelemetryReporter {
  report<EventType extends SloEbtEventType>(
    eventType: EventType,
    getData: () => SloEbtEventMap[EventType]
  ): void;
}

export class SloTelemetryService {
  constructor(
    private readonly analytics: Pick<AnalyticsServiceSetup, 'reportEvent'>,
    private readonly logger: Logger
  ) {}

  /** Returns a reporter attaching the given origin to every event, never throwing on failure. */
  public getReporter(origin: EventOrigin): SloTelemetryReporter {
    return {
      report: (eventType, getData) => {
        try {
          this.analytics.reportEvent(eventType, { ...getData(), origin });
        } catch (error) {
          this.logger.warn(`Failed to report ${eventType} telemetry event: ${error.message}`);
        }
      },
    };
  }
}
