/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import { ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT } from '../event_based_telemetry';

export const reportScheduleAction = ({
  action,
  analytics,
  hasActions,
  interval,
  logger,
}: {
  action: string;
  analytics: AnalyticsServiceSetup;
  hasActions?: boolean;
  interval?: string;
  logger: Logger;
}): void => {
  try {
    analytics.reportEvent(ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType, {
      action,
      has_actions: hasActions,
      interval,
    });
  } catch (error) {
    logger.debug(
      () =>
        `Failed to report ${ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType} telemetry: ${error.message}`
    );
  }
};
