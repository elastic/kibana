/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQL_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';
import { EqlRuleParams } from '../../rule_schema';
import { eqlExecutor } from './eql';
import type { SecurityAlertType, SignalSourceHit } from '../types';
import { validateIndexPatterns } from '../utils';
import { getIsAlertSuppressionActive } from '../utils/get_is_alert_suppression_active';
import { wrapSuppressedAlerts } from '../utils/wrap_suppressed_alerts';
import type { BuildReasonMessage } from '../utils/reason_formatters';

export const createEqlAlertType = (): SecurityAlertType<EqlRuleParams, {}> => {
  return {
    id: EQL_RULE_TYPE_ID,
    name: 'Event Correlation Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return EqlRuleParams.parse(object);
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: EqlRuleParams },
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

      const wrapSuppressedHits = (
        events: SignalSourceHit[],
        buildReasonMessage: BuildReasonMessage
      ) =>
        wrapSuppressedAlerts({
          events,
          buildReasonMessage,
          sharedParams,
        });

      const { result, loggedRequests } = await eqlExecutor({
        sharedParams,
        services,
        wrapSuppressedHits,
        isAlertSuppressionActive,
        experimentalFeatures: sharedParams.experimentalFeatures,
        state,
        scheduleNotificationResponseActionsService:
          sharedParams.scheduleNotificationResponseActionsService,
      });
      return { ...result, state, ...(loggedRequests ? { loggedRequests } : {}) };
    },
  };
};
