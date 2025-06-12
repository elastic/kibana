/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import type { WrapSuppressedHits, SecuritySharedParams, SecurityRuleServices } from '../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { createThreatSignals } from './threat_mapping/create_threat_signals';
import type { ThreatRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

export const indicatorMatchExecutor = async ({
  sharedParams,
  services,
  eventsTelemetry,
  wrapSuppressedHits,
  licensing,
  scheduleNotificationResponseActionsService,
}: {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: SecurityRuleServices;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}) => {
  return withSecuritySpan('indicatorMatchExecutor', async () => {
    return createThreatSignals({
      sharedParams,
      eventsTelemetry,
      services,
      wrapSuppressedHits,
      licensing,
      scheduleNotificationResponseActionsService,
    });
  });
};
