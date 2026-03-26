/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  ApiConfig,
  AttackDiscovery,
  AttackDiscoveryStatus,
  Replacements,
} from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';
import type { Moment } from 'moment';
import moment from 'moment/moment';

import { reportAttackDiscoveryGenerationSuccess } from './telemetry';

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};

export const reportAttackDiscoverySuccessTelemetry = ({
  anonymizedAlerts,
  apiConfig,
  attackDiscoveries,
  hasFilter,
  end,
  logger,
  size,
  start,
  startTime,
  telemetry,
}: {
  anonymizedAlerts: Document[];
  apiConfig: ApiConfig;
  attackDiscoveries: AttackDiscovery[] | null;
  end?: string;
  hasFilter: boolean;
  latestReplacements: Replacements;
  logger: Logger;
  size: number;
  // start of attack discovery time range
  start?: string;
  // start time of attack discovery
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    const endTime = moment();
    const durationMs = endTime.diff(startTime);
    const alertsContextCount = anonymizedAlerts.length;

    reportAttackDiscoveryGenerationSuccess({
      alertsContextCount,
      apiConfig,
      attackDiscoveries,
      durationMs,
      end,
      hasFilter,
      size,
      start,
      telemetry,
    });
  } catch (err) {
    logger.error(`Failed to report attack discovery success telemetry: ${err}`);
  }
};
