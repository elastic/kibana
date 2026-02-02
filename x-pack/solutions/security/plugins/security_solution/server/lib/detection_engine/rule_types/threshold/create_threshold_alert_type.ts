/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THRESHOLD_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';

import { ThresholdRuleParams } from '../../rule_schema';
import { thresholdExecutor } from './threshold';
import type { ThresholdAlertState } from './types';
import type { SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';
import { getFilter } from '../utils/get_filter';
import { esqlExecutor } from '../esql/esql';

export const createThresholdAlertType = (): SecurityAlertType<
  ThresholdRuleParams,
  ThresholdAlertState
> => {
  return {
    id: THRESHOLD_RULE_TYPE_ID,
    name: 'Threshold Rule',
    validate: {
      params: {
        validate: (object: unknown): ThresholdRuleParams => {
          return ThresholdRuleParams.parse(object);
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
      params: { type: 'zod', schema: ThresholdRuleParams },
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
      const { sharedParams, services, startedAt, state } = execOptions;

      const ruleParams = sharedParams.completeRule.ruleParams;
      const { threshold } = ruleParams;
      const byFields = threshold?.field?.join(',') ?? '';

      const nullFilters = threshold.field.map((field) => `${field} IS NOT NULL`).join(' AND ');
      const nullFiltersCommand = threshold.field.length > 0 ? ` | WHERE ${nullFilters}` : '';

      const { field, value } = threshold.cardinality?.[0] ?? {};

      const cardinalityAggrCommand = threshold.cardinality?.length
        ? `, threshold.cardinality = COUNT_DISTINCT(${field})`
        : '';

      const cardinalityCommand = threshold.cardinality?.length
        ? ` | WHERE threshold.cardinality >= ${value}`
        : '';

      const countCommand = `| WHERE threshold.count >= ${threshold.value}`;
      const aggrCommand = `| STATS threshold.count = count(*)${cardinalityAggrCommand}`;
      const aggrByCommand = byFields ? `${aggrCommand} BY ${byFields}` : aggrCommand;

      const esqlQuery = [
        `FROM ${ruleParams.index}`,
        nullFiltersCommand,
        aggrByCommand,
        countCommand,
        cardinalityCommand,
      ]
        .filter(Boolean)
        .join(' ');

      const esFilter = await getFilter({
        type: ruleParams.type,
        filters: ruleParams.filters || [],
        language: ruleParams.language,
        query: ruleParams.query,
        savedId: ruleParams.savedId,
        services,
        index: ruleParams.index,
        exceptionFilter: undefined,
        loadFields: true,
      });

      const resultEsql = await esqlExecutor({
        ...execOptions,
        sharedParams: {
          ...sharedParams,
          completeRule: {
            ...sharedParams.completeRule,
            ruleParams: {
              ...ruleParams,
              query: esqlQuery,
            },
          },
        },
        licensing: sharedParams.licensing,
        scheduleNotificationResponseActionsService:
          sharedParams.scheduleNotificationResponseActionsService,
        filters: esFilter,
      });
      return resultEsql;
      // return { resultEsql, state: buildThresholdAlertStateHistory(state, []) };

      const result = await thresholdExecutor({
        sharedParams,
        services,
        startedAt,
        state,
        licensing: sharedParams.licensing,
        scheduleNotificationResponseActionsService:
          sharedParams.scheduleNotificationResponseActionsService,
      });
      return result;
    },
  };
};
