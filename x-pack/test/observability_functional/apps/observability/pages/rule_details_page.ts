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
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
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
          logView: {
            logViewId: 'Default',
            type: 'log-view-reference',
          },
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
        await find.clickByButtonText(logThresholdRuleName);
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

    describe('Page components', () => {
      before(async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
      });
      it('show the rule name as the page title', async () => {
        await retry.waitFor(
          'Rule name to be visible',
          async () => await testSubjects.exists('ruleName')
        );
        const ruleName = await testSubjects.getVisibleText('ruleName');
        expect(ruleName).to.be(logThresholdRuleName);
      });

      it('shows the rule status section in the rule summary', async () => {
        await testSubjects.existOrFail('ruleStatusPanel');
      });

      it('shows the rule definition section in the rule summary', async () => {
        await testSubjects.existOrFail('ruleSummaryRuleDefinition');
      });

      it('maps correctly the rule type with the human readable rule type', async () => {
        await retry.waitFor(
          'ruleTypeIndex to be loaded from hook',
          async () => await testSubjects.exists('ruleSummaryRuleType')
        );
        const ruleType = await testSubjects.getVisibleText('ruleSummaryRuleType');
        expect(ruleType).to.be('Log threshold');
      });
    });

    describe('Alert summary widget component', () => {
      before(async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
        await retry.waitFor(
          'Rule details to be visible',
          async () => await testSubjects.exists('ruleDetails')
        );
      });

      it('shows component on the rule details page', async () => {
        await observability.components.alertSummaryWidget.getCompactComponentSelectorOrFail();

        const timeRangeTitle =
          await observability.components.alertSummaryWidget.getCompactTimeRangeTitle();
        expect(timeRangeTitle).to.be('Last 30 days');
      });

      it('handles clicking on active alerts correctly', async () => {
        const activeAlerts =
          await observability.components.alertSummaryWidget.getActiveAlertSelector();
        await activeAlerts.click();

        const url = await browser.getCurrentUrl();
        const from = 'rangeFrom:now-30d';
        const to = 'rangeTo:now';

        expect(url.includes('tabId=alerts')).to.be(true);
        expect(url.includes('status%3Aactive')).to.be(true);
        expect(url.includes(from.replaceAll(':', '%3A'))).to.be(true);
        expect(url.includes(to.replaceAll(':', '%3A'))).to.be(true);
      });

      it('handles clicking on total alerts correctly', async () => {
        const totalAlerts =
          await observability.components.alertSummaryWidget.getTotalAlertSelector();
        await totalAlerts.click();

        const url = await browser.getCurrentUrl();
        const from = 'rangeFrom:now-30d';
        const to = 'rangeTo:now';

        expect(url.includes('tabId=alerts')).to.be(true);
        expect(url.includes('status%3Aall')).to.be(true);
        expect(url.includes(from.replaceAll(':', '%3A'))).to.be(true);
        expect(url.includes(to.replaceAll(':', '%3A'))).to.be(true);
      });
    });

    describe('User permissions', () => {
      before(async () => {
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
      });
      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });
      it('should show the actions button if user has permissions', async () => {
        await retry.waitFor(
          'Actions button to be visible',
          async () => await testSubjects.exists('actions')
        );
      });

      it('should show the rule edit and delete button if user has permissions', async () => {
        await testSubjects.click('actions');

        await testSubjects.existOrFail('editRuleButton');
        await testSubjects.existOrFail('deleteRuleButton');
      });

      it('should close actions popover correctly', async () => {
        await testSubjects.click('actions');

        // popover should be closed
        await testSubjects.missingOrFail('editRuleButton');
      });

      it('should not show the actions button if user has no permissions', async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['read'],
          })
        );
        await observability.alerts.common.navigateToRuleDetailsByRuleId(logThresholdRuleId);
        await testSubjects.missingOrFail('actions');
      });
    });
  });
};
