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
import type { SecurityAlertType, WrapSuppressedHits } from '../types';
import { wrapSuppressedAlerts } from '../utils/wrap_suppressed_alerts';
import type { SetupPlugins } from '../../../../plugin';

export const createMlAlertType = (
  ml: SetupPlugins['ml']
): SecurityAlertType<MachineLearningRuleParams, { isLoggedRequestsEnabled?: boolean }> => {
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
    solution: 'security',
    async executor(execOptions) {
      const { sharedParams, services, state } = execOptions;

      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: sharedParams.completeRule.ruleParams.alertSuppression,
        licensing: sharedParams.licensing,
      });
      const isLoggedRequestsEnabled = Boolean(state?.isLoggedRequestsEnabled);

      const wrapSuppressedHits: WrapSuppressedHits = (events, buildReasonMessage) =>
        wrapSuppressedAlerts({
          events,
          buildReasonMessage,
          sharedParams,
        });

      const { result, loggedRequests } = await mlExecutor({
        sharedParams,
        ml,
        services,
        wrapSuppressedHits,
        isAlertSuppressionActive,
        scheduleNotificationResponseActionsService:
          sharedParams.scheduleNotificationResponseActionsService,
        isLoggedRequestsEnabled,
      });
      return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    },
  };
};
