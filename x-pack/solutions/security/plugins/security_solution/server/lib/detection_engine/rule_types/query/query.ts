/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { getFilter } from '../utils/get_filter';
import type { BucketHistory } from './alert_suppression/group_and_bulk_create';
import { groupAndBulkCreate } from './alert_suppression/group_and_bulk_create';
import { searchAfterAndBulkCreate } from '../utils/search_after_bulk_create';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { UnifiedQueryRuleParams } from '../../rule_schema';
import { buildReasonMessageForQueryAlert } from '../utils/reason_formatters';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';
import { buildTimeRangeFilter } from '../utils/build_events_query';

const PIT_KEEP_ALIVE = '5m';

export const queryExecutor = async ({
  sharedParams,
  eventsTelemetry,
  services,
  bucketHistory,
  scheduleNotificationResponseActionsService,
  licensing,
  isLoggedRequestsEnabled,
}: {
  sharedParams: SecuritySharedParams<UnifiedQueryRuleParams>;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: SecurityRuleServices;
  bucketHistory?: BucketHistory[];
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
  licensing: LicensingPluginSetup;
  isLoggedRequestsEnabled: boolean;
}) => {
  const { completeRule } = sharedParams;
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('queryExecutor', async () => {
    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: sharedParams.inputIndex,
      exceptionFilter: sharedParams.exceptionFilter,
      loadFields: true,
    });

    const license = await firstValueFrom(licensing.license$);
    const hasPlatinumLicense = license.hasAtLeast('platinum');

    let pitId = (
      await services.scopedClusterClient.asCurrentUser.openPointInTime({
        index: sharedParams.inputIndex,
        keep_alive: PIT_KEEP_ALIVE,
        allow_partial_search_results: true,
        ignore_unavailable: true,
        index_filter: buildTimeRangeFilter({
          from: sharedParams.tuple.from.toISOString(),
          to: sharedParams.tuple.to.toISOString(),
          primaryTimestamp: sharedParams.primaryTimestamp,
          secondaryTimestamp: sharedParams.secondaryTimestamp,
        }),
      })
    ).id;

    const reassignPitId = (newPitId: string | undefined) => {
      if (newPitId) pitId = newPitId;
    };

    const result =
      // TODO: replace this with getIsAlertSuppressionActive function
      ruleParams.alertSuppression?.groupBy != null && hasPlatinumLicense
        ? await groupAndBulkCreate({
            sharedParams,
            services,
            filter: esFilter,
            buildReasonMessage: buildReasonMessageForQueryAlert,
            bucketHistory,
            groupByFields: ruleParams.alertSuppression.groupBy,
            eventsTelemetry,
            isLoggedRequestsEnabled,
            pitId,
            reassignPitId,
          })
        : {
            ...(await searchAfterAndBulkCreate({
              sharedParams,
              services,
              eventsTelemetry,
              filter: esFilter,
              buildReasonMessage: buildReasonMessageForQueryAlert,
              isLoggedRequestsEnabled,
              pitId,
              reassignPitId,
            })),
            state: { isLoggedRequestsEnabled },
          };
    try {
      await services.scopedClusterClient.asCurrentUser.closePointInTime({ id: pitId });
    } catch (error) {
      // Don't fail due to a bad point in time closure. We have seen failures in e2e tests during nominal operations.
      sharedParams.ruleExecutionLogger.warn(
        `Error trying to close point in time: "${pitId}", it will expire within "${PIT_KEEP_ALIVE}". Error is: "${error}"`
      );
    }
    scheduleNotificationResponseActionsService({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: completeRule.ruleParams.responseActions,
    });

    return result;
  });
};
