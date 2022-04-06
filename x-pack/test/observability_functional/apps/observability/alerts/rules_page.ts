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

  const retry = getService('retry');
  async function createRule(rule: any) {
    const ruleResponse = await supertest
      .post('/api/alerting/rule')
      .set('kbn-xsrf', 'foo')
      .send(rule);
    expect(ruleResponse.status).to.eql(200);
    return ruleResponse.body.id;
  }

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

    describe.skip('Feature flag', () => {
      // Related to the config inside x-pack/test/observability_functional/with_rac_write.config.ts
      it('Link point to O11y Rules pages by default or when "xpack.observability.unsafe.rules.enabled: true"', async () => {
        const manageRulesPageHref = await observability.alerts.rulesPage.getManageRulesPageHref();
        expect(new URL(manageRulesPageHref).pathname).equal('/app/observability/alerts/rules');
      });
    });

    describe.skip('Create rule button', () => {
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
        await createRule(uptimeRule);
        await createRule(logThresholdRule);
        await observability.alerts.common.navigateToRulesPage();
      });

      it('shows the rules table ', async () => {
        await testSubjects.existOrFail('rulesList');
      });
    });

    describe.skip('User permissions', () => {
      it('shows the Create Rule button when user has permissions', async () => {
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Create rule button',
          async () => await testSubjects.exists('createRuleButton')
        );
      });

      it(`shows the no permission prompt when the user has no permissions`, async () => {
        await observability.users.setTestUserRole({
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ spaces: ['*'], base: [], feature: { discover: ['all'] } }],
        });
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'No permissions prompt',
          async () => await testSubjects.exists('noPermissionPrompt')
        );
      });
    });
  });
};
