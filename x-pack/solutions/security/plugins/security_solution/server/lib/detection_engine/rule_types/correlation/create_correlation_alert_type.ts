/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORRELATION_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';
import { CorrelationRuleParams } from '../../rule_schema';
import { correlationExecutor } from './correlation';
import type { SecurityAlertType } from '../types';
import type { CorrelationState } from './types';

export const createCorrelationAlertType = (): SecurityAlertType<
  CorrelationRuleParams,
  CorrelationState
> => {
  return {
    id: CORRELATION_RULE_TYPE_ID,
    name: 'Correlation Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return CorrelationRuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: {
        type: 'zod',
        schema: CorrelationRuleParams,
      },
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
    executor: (params) =>
      correlationExecutor({
        ...params,
        licensing: params.sharedParams.licensing,
        scheduleNotificationResponseActionsService:
          params.sharedParams.scheduleNotificationResponseActionsService,
      }),
  };
};
