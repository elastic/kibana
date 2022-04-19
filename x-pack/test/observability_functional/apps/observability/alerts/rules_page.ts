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

  const getRulesList = async (tableRows: any[]) => {
    const rows = [];
    for (const euiTableRow of tableRows) {
      const $ = await euiTableRow.parseDomContent();
      rows.push({
        name: $.findTestSubjects('rulesTableCell-name').find('a').text(),
        enabled: $.findTestSubjects('rulesTableCell-ContextStatus').find('button').attr('title'),
      });
    }
    return rows;
  };

  describe('Observability Rules page', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.navigateWithoutFilter();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    describe('Feature flag', () => {
      // Related to the config inside x-pack/test/observability_functional/with_rac_write.config.ts
      it('Link point to O11y Rules pages by default or when "xpack.observability.unsafe.rules.enabled: true"', async () => {
        const manageRulesPageHref = await observability.alerts.rulesPage.getManageRulesPageHref();
        expect(new URL(manageRulesPageHref).pathname).equal('/app/observability/alerts/rules');
      });
    });

    describe('Create rule button', () => {
      it('Show Create Rule flyout when Create Rule button is clicked', async () => {
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Create Rule button is visible',
          async () => await testSubjects.exists('createRuleButton')
        );
        await observability.alerts.rulesPage.clickCreateRuleButton();
        await retry.waitFor(
          'Create Rule flyout is visible',
          async () => await testSubjects.exists('addRuleFlyout')
        );
      });
    });

    describe('Rules table', () => {
      let uptimeRuleId: string;
      let logThresholdRuleId: string;
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
          name: 'uptime',
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
          name: 'error-log',
          rule_type_id: 'logs.alert.document.count',
          notify_when: 'onActionGroupChange',
          actions: [],
        };
        uptimeRuleId = await createRule(uptimeRule);
        logThresholdRuleId = await createRule(logThresholdRule);
        await observability.alerts.common.navigateToRulesPage();
      });
      after(async () => {
        await deleteRuleById(uptimeRuleId);
        await deleteRuleById(logThresholdRuleId);
      });

      it('shows the rules table ', async () => {
        await testSubjects.existOrFail('rulesList');
        const tableRows = await find.allByCssSelector('.euiTableRow');
        const rows = await getRulesList(tableRows);
        expect(rows.length).to.be(2);
        expect(rows[0].name).to.be('error-log');
        expect(rows[0].enabled).to.be('Enabled');
        expect(rows[1].name).to.be('uptime');
        expect(rows[1].enabled).to.be('Enabled');
      });

      it('changes the rule status to "disabled"', async () => {
        await testSubjects.existOrFail('rulesList');
        await observability.alerts.rulesPage.clickRuleStatusDropDownMenu();
        await observability.alerts.rulesPage.clickDisableFromDropDownMenu();
        await retry.waitFor('The rule to be disabled', async () => {
          const tableRows = await find.allByCssSelector('.euiTableRow');
          const rows = await getRulesList(tableRows);
          expect(rows[0].enabled).to.be('Disabled');
          return true;
        });
      });
    });

    describe('User permissions', () => {
      it('shows the Create Rule button when user has permissions', async () => {
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Create rule button',
          async () => await testSubjects.exists('createRuleButton')
        );
      });

      it(`shows the no permission prompt when the user has no permissions`, async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['read'],
          })
        );
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'No permissions prompt',
          async () => await testSubjects.exists('noPermissionPrompt')
        );
      });
    });
  });
};
