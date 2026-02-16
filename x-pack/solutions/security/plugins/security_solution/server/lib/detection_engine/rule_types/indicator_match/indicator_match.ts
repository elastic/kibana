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
import { esqlIndicatorMatchExecutor } from './threat_mapping/esql_indicator_match';
import { esqlInlinestatsIndicatorMatchExecutor } from './threat_mapping/esql_inlinestats_indicator_match';
import { validateThreatMappingForEsql } from './threat_mapping/build_esql_indicator_match_query';
import { validateThreatMappingForInlinestats } from './threat_mapping/build_esql_inlinestats_indicator_match_query';
import type { ThreatRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

/**
 * Determines whether to use ES|QL-based indicator match execution.
 * 
 * Conditions for using ES|QL:
 * 1. The experimental feature flag is enabled
 * 2. The threat mapping is compatible with ES|QL LOOKUP JOIN
 * 3. No alert suppression is configured (not yet supported in ES|QL path)
 */
const shouldUseEsqlExecution = (
  sharedParams: SecuritySharedParams<ThreatRuleParams>,
  useEsqlIndicatorMatch: boolean
): boolean => {
  if (!useEsqlIndicatorMatch) {
    return false;
  }

  const { completeRule } = sharedParams;
  const { threatMapping, alertSuppression } = completeRule.ruleParams;

  // Alert suppression is not yet supported in the ES|QL path
  if (alertSuppression?.groupBy?.length) {
    return false;
  }

  // Validate threat mapping compatibility with ES|QL
  const validationErrors = validateThreatMappingForEsql(threatMapping);
  if (validationErrors.length > 0) {
    return false;
  }

  return true;
};

export const indicatorMatchExecutor = async ({
  sharedParams,
  services,
  eventsTelemetry,
  wrapSuppressedHits,
  licensing,
  scheduleNotificationResponseActionsService,
  useEsqlIndicatorMatch = false,
}: {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: SecurityRuleServices;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
  /**
   * Experimental flag to enable ES|QL-based indicator match execution.
   * When enabled and conditions are met, uses ES|QL LOOKUP JOIN for threat matching.
   */
  useEsqlIndicatorMatch?: boolean;
}) => {
  return withSecuritySpan('indicatorMatchExecutor', async () => {
    const ruleName = sharedParams.completeRule.ruleConfig.name;

    // Check if we should use the ES|QL INLINESTATS execution path
    if (true || ruleName.startsWith('esql_inlinestats')) {
      const inlinestatsValidationErrors = validateThreatMappingForInlinestats(
        sharedParams.completeRule.ruleParams.threatMapping
      );
      if (inlinestatsValidationErrors.length === 0) {
        sharedParams.ruleExecutionLogger.debug(
          'Using ES|QL INLINESTATS-based indicator match execution (experimental)'
        );

        return esqlInlinestatsIndicatorMatchExecutor({
          sharedParams,
          services,
          licensing,
          scheduleNotificationResponseActionsService,
        });
      }
    }

    // Check if we should use the ES|QL LOOKUP JOIN execution path
    if (ruleName.startsWith('esql')) {
      sharedParams.ruleExecutionLogger.debug(
        'Using ES|QL LOOKUP JOIN-based indicator match execution (experimental)'
      );

      return esqlIndicatorMatchExecutor({
        sharedParams,
        services,
        licensing,
        scheduleNotificationResponseActionsService,
      });
    }

    // Default: Use the traditional indicator match execution
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
