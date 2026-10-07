/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MonitorErrorEvent, MonitorUpdateEvent } from './types';

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

  public reportEvent(eventType: string, event: MonitorUpdateEvent | MonitorErrorEvent): void {
    this.analytics.reportEvent(eventType, { ...event, issuedTo: this.issuedTo });
  }
}
