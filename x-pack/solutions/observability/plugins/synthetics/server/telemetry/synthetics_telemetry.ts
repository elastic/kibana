/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  MONITOR_CURRENT_EVENT_TYPE,
  MONITOR_ERROR_EVENT_TYPE,
  MONITOR_UPDATE_EVENT_TYPE,
} from './constants';
import type { MonitorErrorEvent, MonitorUpdateEvent } from './types';

export interface SyntheticsEventMap {
  [MONITOR_UPDATE_EVENT_TYPE]: MonitorUpdateEvent;
  [MONITOR_CURRENT_EVENT_TYPE]: MonitorUpdateEvent;
  [MONITOR_ERROR_EVENT_TYPE]: MonitorErrorEvent;
}

/**
 * Reports Synthetics EBT events, enriching them with the license holder.
 * `issuedTo` is not part of the EBT context, so it is added per event rather than globally.
 */
export class SyntheticsTelemetry {
  private issuedTo?: string;

  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  public async loadLicenseInfo(esClient: ElasticsearchClient): Promise<void> {
    try {
      const { license } = await esClient.license.get();
      this.issuedTo = license?.issued_to;
    } catch (error) {
      this.logger.debug(`Error fetching license information: ${error}`);
    }
  }

  public reportEvent<K extends keyof SyntheticsEventMap>(
    eventType: K,
    event: SyntheticsEventMap[K]
  ): void {
    this.analytics.reportEvent(eventType, { ...event, issuedTo: this.issuedTo });
  }
}
