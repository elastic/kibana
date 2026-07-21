/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import {
  ATTACK_DISCOVERY_MISCONFIGURATION_EVENT,
  type MisconfigurationType,
} from '../event_based_telemetry';

interface ReportMisconfigurationParams {
  detail?: string;
  misconfiguration_type: MisconfigurationType;
  space_id?: string;
  workflow_id?: string;
}

export const reportMisconfiguration = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: ReportMisconfigurationParams;
}): void => {
  try {
    analytics.reportEvent(ATTACK_DISCOVERY_MISCONFIGURATION_EVENT.eventType, params);
  } catch (error) {
    logger.debug(
      () =>
        `Failed to report ${ATTACK_DISCOVERY_MISCONFIGURATION_EVENT.eventType} telemetry: ${error.message}`
    );
  }
};
