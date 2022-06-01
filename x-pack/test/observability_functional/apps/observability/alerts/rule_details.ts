/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const observability = getService('observability');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const RULE_ENDPOINT = '/api/alerting/rule';

  async function createRule(rule: any): Promise<string> {
    const ruleResponse = await supertest.post(RULE_ENDPOINT).set('kbn-xsrf', 'foo').send(rule);
    expect(ruleResponse.status).to.eql(200);
    return ruleResponse.body.id;
  }
  async function deleteRuleById(ruleId: string) {
    const ruleResponse = await supertest
      .delete(`${RULE_ENDPOINT}/${ruleId}`)
      .set('kbn-xsrf', 'foo');
    expect(ruleResponse.status).to.eql(204);
    return true;
  }

  describe('Observability Rule Details page', function () {
    this.tags('includeFirefox');
    const observability = getService('observability');

    let uptimeRuleId: string;
    const uptimeRuleName = 'uptime';

    let logThresholdRuleId: string;
    const logThresholdRuleName = 'error-log';

    before(async () => {
      const uptimeRule = {
        params: {
          search: '',
          numTimes: 5,
          timerangeUnit: 'm',
          timerangeCount: 15,
          shouldCheckStatus: true,
          shouldCheckAvailability: true,
          availability: { range: 30, rangeUnit: 'd', threshold: '99' },
        },
        consumer: 'alerts',
        schedule: { interval: '1m' },
        tags: [],
        name: uptimeRuleName,
        rule_type_id: 'xpack.uptime.alerts.monitorStatus',
        notify_when: 'onActionGroupChange',
        actions: [],
      };
      const logThresholdRule = {
        params: {
          timeSize: 5,
          timeUnit: 'm',
          count: { value: 75, comparator: 'more than' },
          criteria: [{ field: 'log.level', comparator: 'equals', value: 'error' }],
        },
        consumer: 'alerts',
        schedule: { interval: '1m' },
        tags: [],
        name: logThresholdRuleName,
        rule_type_id: 'logs.alert.document.count',
        notify_when: 'onActionGroupChange',
        actions: [],
      };
      uptimeRuleId = await createRule(uptimeRule);
      logThresholdRuleId = await createRule(logThresholdRule);
      // await observability.alerts.common.navigateToRulesPage();
    });
    after(async () => {
      await deleteRuleById(uptimeRuleId);
      await deleteRuleById(logThresholdRuleId);
    });

    describe('Navigate to the new Rule Details page', () => {
      it('should navigate to the new rule details page by clicking on the rule from the rules table', async () => {
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Rules table to be visible',
          async () => await testSubjects.exists('rulesList')
        );
        await find.clickByLinkText(logThresholdRuleName);
        await retry.waitFor(
          'Rule details to be visible',
          async () => await testSubjects.exists('ruleDetails')
        );
      });

      it('should navigate to the new rule details page by URL', async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(uptimeRuleId);
        await retry.waitFor(
          'Rule details to be visible',
          async () => await testSubjects.exists('ruleDetails')
        );
      });
    });

    describe('Rule details page components', () => {
      it('show the rule name as the page title', async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
        await retry.waitFor(
          'Rule name to be visible',
          async () => await testSubjects.exists('ruleName')
        );
        const ruleName = await testSubjects.getVisibleText('ruleName');
        expect(ruleName).to.be(logThresholdRuleName);
      });

      it('show the rule name as the page title', async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
        await retry.waitFor(
          'Rule name to be visible',
          async () => await testSubjects.exists('ruleName')
        );
        const ruleName = await testSubjects.getVisibleText('ruleName');
        expect(ruleName).to.be(logThresholdRuleName);
      });
    });
  });
};
