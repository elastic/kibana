/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, BrowserAuthFixture, SamlAuth } from '@kbn/scout-oblt';

import type { CreateRuleResponse } from './types';

interface CreateRuleParams {
  name: string;
  ruleTypeId: string;
}

export async function createRule(
  apiServices: ApiServicesFixture,
  ruleParams: Partial<CreateRuleParams> = {}
) {
  return apiServices.alerting.rules.create({
    name: 'Test rule',
    ruleTypeId: 'observability.rules.custom_threshold',
    ...ruleParams,
    consumer: 'alerts',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [{ name: 'A', aggType: 'count' }],
          threshold: [200000],
          timeSize: 1,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisapear: false,
      searchConfiguration: {
        query: {
          query: '',
          language: 'kuery',
        },
        index: 'remote_cluster:logs-*',
      },
    },
    schedule: {
      interval: '1m',
    },
    actions: [],
  }) as Promise<CreateRuleResponse>;
}

export async function getDisposableRule(apiServices: ApiServicesFixture) {
  const rule = await createRule(apiServices);
  return {
    instance: rule,
    async [Symbol.asyncDispose]() {
      await apiServices.alerting.rules.delete(rule.data.id);
    },
  };
}
