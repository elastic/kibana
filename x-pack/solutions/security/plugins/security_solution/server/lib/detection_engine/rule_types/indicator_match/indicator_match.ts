/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { WrapSuppressedHits, SecuritySharedParams, CreateRuleOptions } from '../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { createThreatSignals } from './threat_mapping/create_threat_signals';
import type { ThreatRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { ExperimentalFeatures } from '../../../../../common';

export const indicatorMatchExecutor = async ({
  sharedParams,
  services,
  eventsTelemetry,
  wrapSuppressedHits,
  licensing,
  experimentalFeatures,
  scheduleNotificationResponseActionsService,
}: {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
  experimentalFeatures: ExperimentalFeatures;
}) => {
  return withSecuritySpan('indicatorMatchExecutor', async () => {
    return createThreatSignals({
      sharedParams,
      eventsTelemetry,
      services,
      wrapSuppressedHits,
      licensing,
      experimentalFeatures,
      scheduleNotificationResponseActionsService,
    });
  });
};
