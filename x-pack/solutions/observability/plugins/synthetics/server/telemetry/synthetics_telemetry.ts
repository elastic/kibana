/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { ERROR_THROTTLE_MS, MAX_THROTTLE_KEYS, getErrorThrottleKey } from './error_noise';
import type {
  MONITOR_CURRENT_EVENT_TYPE,
  MONITOR_ERROR_EVENT_TYPE,
  MONITOR_UPDATE_EVENT_TYPE,
  PL_REBALANCE_EVENT_TYPE,
  PL_SHARDING_SNAPSHOT_EVENT_TYPE,
  PL_SHARDING_STATE_EVENT_TYPE,
} from './constants';
import type {
  MonitorErrorEvent,
  MonitorUpdateEvent,
  PrivateLocationRebalanceEvent,
  PrivateLocationShardingSnapshotEvent,
  PrivateLocationShardingStateEvent,
} from './types';

export interface SyntheticsEventMap {
  [MONITOR_UPDATE_EVENT_TYPE]: MonitorUpdateEvent;
  [MONITOR_CURRENT_EVENT_TYPE]: MonitorUpdateEvent;
  [MONITOR_ERROR_EVENT_TYPE]: MonitorErrorEvent;
  [PL_REBALANCE_EVENT_TYPE]: PrivateLocationRebalanceEvent;
  [PL_SHARDING_SNAPSHOT_EVENT_TYPE]: PrivateLocationShardingSnapshotEvent;
  [PL_SHARDING_STATE_EVENT_TYPE]: PrivateLocationShardingStateEvent;
}

/**
 * Reports Synthetics EBT events, enriching them with the license holder.
 * `issuedTo` is not part of the EBT context, so it is added per event rather than globally.
 */
export class SyntheticsTelemetry {
  private issuedTo?: string;
  private readonly errorReportedAt = new Map<string, number>();

  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  public async loadLicenseInfo(esClient: ElasticsearchClient): Promise<void> {
    try {
      const { license } = await esClient.license.get();
      this.issuedTo = license?.issued_to;
    } catch (error) {
      this.logger.debug(`Error fetching license information: ${error}`);
    }
  }

  /** True at most once per throttle window for the same error type and message shape. */
  public shouldReportError(event: MonitorErrorEvent, now: number = Date.now()): boolean {
    this.pruneExpiredErrors(now);
    const key = getErrorThrottleKey(event);
    if (this.errorReportedAt.has(key)) {
      return false;
    }
    if (this.errorReportedAt.size >= MAX_THROTTLE_KEYS) {
      this.errorReportedAt.clear();
    }
    this.errorReportedAt.set(key, now);
    return true;
  }

  private pruneExpiredErrors(now: number): void {
    this.errorReportedAt.forEach((reportedAt, key) => {
      if (now - reportedAt >= ERROR_THROTTLE_MS) {
        this.errorReportedAt.delete(key);
      }
    });
  }

  public reportEvent<K extends keyof SyntheticsEventMap>(
    eventType: K,
    event: SyntheticsEventMap[K]
  ): void {
    this.analytics.reportEvent(eventType, { ...event, issuedTo: this.issuedTo });
  }
}
