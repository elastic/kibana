/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, BrowserAuthFixture, SamlAuth } from '@kbn/scout-oblt';
import type { CreateRuleResponse } from './types';

export async function createRule(apiServices: ApiServicesFixture) {
  return apiServices.alerting.rules.create({
    name: 'Test rule',
    ruleTypeId: 'observability.rules.custom_threshold',
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

export const Analyst = {
  async setUp(browserAuth: BrowserAuthFixture) {
    await browserAuth.loginAsViewer();
  },
};

export const LogsEspecialist = {
  /**
   * This method can be called in the `beforeAll` hook of a test suite to set up
   * the necessary role for the Logs Especialist user.
   *
   * Once set up, the role can be used by logging in with the `await browserAuth.loginAs(samlAuth.customRoleName)` method in the `beforeEach` hook.
   * @param samlAuth
   */
  async setUp(samlAuth: SamlAuth) {
    await samlAuth.setCustomRole({
      kibana: [{ base: [], feature: { logs: ['all'] }, spaces: ['*'] }],
      elasticsearch: {
        cluster: ['monitor'],
      },
    });
  },
};
