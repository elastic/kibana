/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const RULE_ENDPOINT = '/api/alerting/rule';
  const INTERNAL_RULE_ENDPOINT = '/internal/alerting/rules';

  const PageObjects = getPageObjects(['header']);

  async function createRule(rule: any): Promise<string> {
    const ruleResponse = await supertest.post(RULE_ENDPOINT).set('kbn-xsrf', 'foo').send(rule);
    expect(ruleResponse.status).to.eql(200);
    return ruleResponse.body.id;
  }

  async function getRuleByName(name: string) {
    const {
      body: { data: rules },
    } = await supertest
      .get(`${INTERNAL_RULE_ENDPOINT}/_find?search=${name}&search_fields=name`)
      .expect(200);
    return rules.find((rule: any) => rule.name === name);
  }

  async function deleteRuleById(ruleId: string) {
    await supertest
      .patch(`${INTERNAL_RULE_ENDPOINT}/_bulk_delete`)
      .set('kbn-xsrf', 'foo')
      .send({ ids: [ruleId] })
      .expect(200);
    return true;
  }

  const getRulesList = async (tableRows: any[]) => {
    const rows = [];
    for (const euiTableRow of tableRows) {
      const $ = await euiTableRow.parseDomContent();
      rows.push({
        name: $.findTestSubjects('rulesTableCell-name').text(),
        enabled: $.findTestSubjects('rulesTableCell-status').find('button').attr('title'),
      });
    }
    return rows;
  };

  const selectAndFillInEsQueryRule = async (ruleName: string) => {
    await testSubjects.click(`.es-query-SelectOption`);
    await retry.waitFor(
      'Create Rule flyout is visible',
      async () => await testSubjects.exists('addRuleFlyoutTitle')
    );

    await testSubjects.setValue('ruleNameInput', ruleName);
    await testSubjects.click('queryFormType_esQuery');
    await testSubjects.click('selectIndexExpression');
    const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
    await indexComboBox.click();
    await indexComboBox.type('*');
    const filterSelectItems = await find.allByCssSelector(`.euiFilterSelectItem`);
    await filterSelectItems[1].click();
    await testSubjects.click('thresholdAlertTimeFieldSelect');
    await retry.try(async () => {
      const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
      expect(fieldOptions[1]).not.to.be(undefined);
      await fieldOptions[1].click();
    });
    await testSubjects.click('closePopover');
  };

  describe('Observability Rules page', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    const navigateAndOpenCreateRuleFlyout = async () => {
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
      it('Link point to O11y Rules pages by default', async () => {
        const manageRulesPageHref =
          (await observability.alerts.rulesPage.getManageRulesPageHref()) ?? '';
        expect(new URL(manageRulesPageHref).pathname).equal('/app/observability/alerts/rules');
      });
    });

    describe('Create rule button', () => {
      it('Show Rule Type Modal when Create Rule button is clicked', async () => {
        await navigateAndOpenCreateRuleFlyout();
      });
    });

    describe('Create rules flyout', () => {
      const ruleName = 'esQueryRule';

      afterEach(async () => {
        const rule = await getRuleByName(ruleName);
        if (rule) {
          await deleteRuleById(rule.id);
        }
        await observability.users.restoreDefaultTestUserRole();
      });

      it('Allows ES query rules to be created by users with only infrastructure feature enabled', async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            infrastructure: ['all'],
          })
        );
        await navigateAndOpenCreateRuleFlyout();
        await selectAndFillInEsQueryRule(ruleName);

        await testSubjects.click('saveRuleButton');

        await PageObjects.header.waitUntilLoadingHasFinished();

        const tableRows = await find.allByCssSelector('.euiTableRow');
        const rows = await getRulesList(tableRows);
        expect(rows.length).to.be(1);
        expect(rows[0].name).to.contain(ruleName);
      });

      it('allows ES query rules to be created by users with only logs feature enabled', async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['all'],
          })
        );
        await navigateAndOpenCreateRuleFlyout();
        await selectAndFillInEsQueryRule(ruleName);

        await testSubjects.click('saveRuleButton');

        await PageObjects.header.waitUntilLoadingHasFinished();

        const tableRows = await find.allByCssSelector('.euiTableRow');
        const rows = await getRulesList(tableRows);
        expect(rows.length).to.be(1);
        expect(rows[0].name).to.contain(ruleName);
      });

      it('Should allow the user to select consumers when creating ES query rules', async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['all'],
            infrastructure: ['all'],
          })
        );

        await navigateAndOpenCreateRuleFlyout();
        await selectAndFillInEsQueryRule(ruleName);

        await retry.waitFor('consumer select modal is visible', async () => {
          return await testSubjects.exists('ruleFormConsumerSelect');
        });

        const consumerSelect = await testSubjects.find('ruleFormConsumerSelect');
        await consumerSelect.click();
        const consumerOptionsList = await testSubjects.find(
          'comboBoxOptionsList ruleFormConsumerSelect-optionsList'
        );
        const consumerOptions = await consumerOptionsList.findAllByClassName(
          'euiComboBoxOption__content'
        );
        expect(consumerOptions.length).eql(2);
        expect(await consumerOptions[0].getVisibleText()).eql('Metrics');
        expect(await consumerOptions[1].getVisibleText()).eql('Logs');
      });
    });

    describe('Rules table', () => {
      let metricThresholdRuleId: string;
      let logThresholdRuleId: string;
      before(async () => {
        const metricThresholdRule = {
          params: {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metric: 'system.cpu.user.pct',
              },
            ],
            sourceId: 'default',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          },
          consumer: 'infrastructure',
          tags: ['infrastructure'],
          name: 'metric-threshold',
          schedule: { interval: '1m' },
          rule_type_id: 'metrics.alert.threshold',
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
          name: 'error-log',
          rule_type_id: 'logs.alert.document.count',
          notify_when: 'onActionGroupChange',
          actions: [],
        };
        metricThresholdRuleId = await createRule(metricThresholdRule);
        logThresholdRuleId = await createRule(logThresholdRule);
        await observability.alerts.common.navigateToRulesPage();
      });
      after(async () => {
        await deleteRuleById(metricThresholdRuleId);
        await deleteRuleById(logThresholdRuleId);
      });

      it('shows the rules table ', async () => {
        await testSubjects.existOrFail('rulesList');
        await testSubjects.waitForDeleted('centerJustifiedSpinner');
        const tableRows = await find.allByCssSelector('.euiTableRow');
        const rows = await getRulesList(tableRows);
        expect(rows.length).to.be(2);
        expect(rows[0].name).to.contain('error-log');
        expect(rows[0].enabled).to.be('Enabled');
        expect(rows[1].name).to.contain('metric-threshold');
        expect(rows[1].enabled).to.be('Enabled');
      });

      it('changes the rule status to "disabled"', async () => {
        await testSubjects.existOrFail('rulesList');
        await observability.alerts.rulesPage.clickRuleStatusDropDownMenu();
        await observability.alerts.rulesPage.clickDisableFromDropDownMenu();

        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.waitFor('The rule to be disabled', async () => {
          const tableRows = await find.allByCssSelector('.euiTableRow');
          const rows = await getRulesList(tableRows);
          expect(rows[0].enabled).to.be('Disabled');
          return true;
        });
      });

      it('should navigate to the details page when clicking on a rule in event logs tab', async () => {
        await observability.alerts.rulesPage.clickLogsTab();
        await observability.alerts.rulesPage.clickOnRuleInEventLogs();
        await testSubjects.existOrFail('ruleDetails');
      });

      it('shows the rule event log when navigating by URL', async () => {
        await observability.alerts.common.navigateToRulesLogsPage();
        await testSubjects.existOrFail('ruleEventLogListTable');
      });
    });

    describe('User permissions', () => {
      it('shows the Create Rule button when user has permissions', async () => {
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Create rule button',
          async () => await testSubjects.exists('createRuleButton')
        );
        await retry.waitFor(
          'Create rule button is enabled',
          async () => await testSubjects.isEnabled('createRuleButton')
        );
      });

      it(`shows the no permission prompt when the user has no permissions`, async () => {
        // We kept this test to make sure that the stack management rule page
        // is showing the right prompt corresponding to the right privileges.
        // Knowing that o11y alert page won't come up if you do not have any
        // kind of privileges to o11y
        await observability.users.setTestUserRole({
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [
            {
              base: [],
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'No permissions prompt',
          async () => await testSubjects.exists('noPermissionPrompt')
        );
        await observability.users.restoreDefaultTestUserRole();
      });

      it(`shows the rules list in read-only mode when the user only has read permissions`, async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['read'],
          })
        );
        await observability.alerts.common.navigateToRulesPage();
        await retry.waitFor(
          'Read-only rules list is visible',
          async () => await testSubjects.exists('rulesList')
        );
        await retry.waitFor(
          'Create rule button is disabled',
          async () => !(await testSubjects.isEnabled('createRuleButton'))
        );
        await observability.users.restoreDefaultTestUserRole();
      });
    });
  });
};
