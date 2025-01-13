/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';

import { MachineLearningRuleParams } from '../../rule_schema';
import { getIsAlertSuppressionActive } from '../utils/get_is_alert_suppression_active';
import { mlExecutor } from './ml';
import type { CreateRuleOptions, SecurityAlertType, WrapSuppressedHits } from '../types';
import { wrapSuppressedAlerts } from '../utils/wrap_suppressed_alerts';

export const createMlAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<
  MachineLearningRuleParams,
  { isLoggedRequestsEnabled?: boolean },
  {},
  'default'
> => {
  const { experimentalFeatures, ml, licensing, scheduleNotificationResponseActionsService } =
    createOptions;
  return {
    id: ML_RULE_TYPE_ID,
    name: 'Machine Learning Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return MachineLearningRuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: MachineLearningRuleParams },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          bulkCreate,
          completeRule,
          listClient,
          ruleExecutionLogger,
          tuple,
          wrapHits,
          exceptionFilter,
          unprocessedExceptions,
          mergeStrategy,
          alertTimestampOverride,
          publicBaseUrl,
          alertWithSuppression,
          primaryTimestamp,
          secondaryTimestamp,
          intendedTimestamp,
        },
        services,
        spaceId,
        state,
      } = execOptions;

      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: completeRule.ruleParams.alertSuppression,
        licensing,
      });
      const isLoggedRequestsEnabled = Boolean(state?.isLoggedRequestsEnabled);

      const wrapSuppressedHits: WrapSuppressedHits = (events, buildReasonMessage) =>
        wrapSuppressedAlerts({
          events,
          spaceId,
          completeRule,
          mergeStrategy,
          indicesToQuery: [],
          buildReasonMessage,
          alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl,
          primaryTimestamp,
          secondaryTimestamp,
          intendedTimestamp,
        });

      const { result, loggedRequests } = await mlExecutor({
        completeRule,
        tuple,
        ml,
        listClient,
        services,
        ruleExecutionLogger,
        bulkCreate,
        wrapHits,
        exceptionFilter,
        unprocessedExceptions,
        wrapSuppressedHits,
        alertTimestampOverride,
        alertWithSuppression,
        isAlertSuppressionActive,
        experimentalFeatures,
        scheduleNotificationResponseActionsService,
        isLoggedRequestsEnabled,
      });
      return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    },
  };
};
