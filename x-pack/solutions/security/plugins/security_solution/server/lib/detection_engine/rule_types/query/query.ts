/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';

import { firstValueFrom } from 'rxjs';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { getFilter } from '../utils/get_filter';
import type { BucketHistory } from './alert_suppression/group_and_bulk_create';
import { groupAndBulkCreate } from './alert_suppression/group_and_bulk_create';
import { searchAfterAndBulkCreate } from '../utils/search_after_bulk_create';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { UnifiedQueryRuleParams } from '../../rule_schema';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForQueryAlert } from '../utils/reason_formatters';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { CreateRuleOptions, SecuritySharedParams } from '../types';

export const queryExecutor = async ({
  sharedParams,
  experimentalFeatures,
  eventsTelemetry,
  services,
  bucketHistory,
  scheduleNotificationResponseActionsService,
  licensing,
  isLoggedRequestsEnabled,
}: {
  sharedParams: SecuritySharedParams<UnifiedQueryRuleParams>;
  experimentalFeatures: ExperimentalFeatures;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  bucketHistory?: BucketHistory[];
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
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
            experimentalFeatures,
            isLoggedRequestsEnabled,
          })
        : {
            ...(await searchAfterAndBulkCreate({
              sharedParams,
              services,
              eventsTelemetry,
              filter: esFilter,
              buildReasonMessage: buildReasonMessageForQueryAlert,
              isLoggedRequestsEnabled,
            })),
            state: { isLoggedRequestsEnabled },
          };

    scheduleNotificationResponseActionsService({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: completeRule.ruleParams.responseActions,
    });

    return result;
  });
};
