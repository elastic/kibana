/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

const INTERNAL_RULE_ENDPOINT = '/internal/alerting/rules';

export interface RuleResponse {
  id: string;
  name: string;
  params: { searchConfiguration: { index: string | { title: string } } };
}

export function createRulesPageHelpers(getService: FtrProviderContext['getService']): {
  getRuleByName: (name: string) => Promise<RuleResponse | undefined>;
  deleteRuleById: (ruleId: string) => Promise<boolean>;
  navigateAndOpenRuleTypeModal: () => Promise<void>;
} {
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const observability = getService('observability');

  async function getRuleByName(name: string) {
    const {
      body: { data: rules },
    } = await supertest
      .post(`${INTERNAL_RULE_ENDPOINT}/_find`)
      .set('kbn-xsrf', 'kibana')
      .send({
        search: name,
        search_fields: ['name'],
      })
      .expect(200);

    return rules.find((rule: { name: string }) => rule.name === name);
  }

  async function deleteRuleById(ruleId: string) {
    await supertest
      .patch(`${INTERNAL_RULE_ENDPOINT}/_bulk_delete`)
      .set('kbn-xsrf', 'foo')
      .send({ ids: [ruleId] })
      .expect(200);
    return true;
  }

  const navigateAndOpenRuleTypeModal = async () => {
    await observability.alerts.common.navigateToRulesPage();
    await retry.waitFor(
      'Create Rule button is visible',
      async () => await testSubjects.exists('createRuleButton')
    );
    await retry.waitFor(
      'Create Rule button is enabled',
      async () => await testSubjects.isEnabled('createRuleButton')
    );
    await observability.alerts.rulesPage.clickCreateRuleButton();
    await retry.waitFor(
      'Rule Type Modal is visible',
      async () => await testSubjects.exists('ruleTypeModal')
    );
  };

  return {
    getRuleByName,
    deleteRuleById,
    navigateAndOpenRuleTypeModal,
  };
}
