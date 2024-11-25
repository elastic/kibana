/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createConnector,
  createAlert,
  createAlertManualCleanup,
  createFailingAlert,
  disableAlert,
  snoozeAlert,
} from '../../../lib/alert_api_actions';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import { getTestAlertData } from '../../../lib/get_test_data';

export default ({ getPageObjects, getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const header = getPageObject('header');
  const objectRemover = new ObjectRemover(supertest);
  const toasts = getService('toasts');

  async function refreshAlertsList() {
    const existsClearFilter = await testSubjects.exists('rules-list-clear-filter');
    const existsRefreshButton = await testSubjects.exists('refreshRulesButton');
    if (existsClearFilter) {
      await testSubjects.click('rules-list-clear-filter');
    } else if (existsRefreshButton) {
      await testSubjects.click('refreshRulesButton');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
    }
    await testSubjects.click('logsTab');
    await testSubjects.click('rulesTab');
  }

  const getAlertSummary = async (ruleId: string) => {
    const { body: summary } = await supertest
      .get(`/internal/alerting/rule/${encodeURIComponent(ruleId)}/_alert_summary`)
      .expect(200);
    return summary;
  };

  // FLAKY: https://github.com/elastic/kibana/issues/157623
  describe.skip('rules list', function () {
    const assertRulesLength = async (length: number) => {
      return await retry.try(async () => {
        const rules = await pageObjects.triggersActionsUI.getAlertsList();
        expect(rules.length).to.equal(length);
      });
    };

    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should display alerts in alphabetical order', async () => {
      const uniqueKey = generateUniqueKey();
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b', tags: [uniqueKey] },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'c', tags: [uniqueKey] },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a', tags: [uniqueKey] },
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(uniqueKey);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(3);
      // rule list shows name and rule type id
      expect(searchResults[0].name).to.eql('aTest: Noop');
      expect(searchResults[1].name).to.eql('bTest: Noop');
      expect(searchResults[2].name).to.eql('cTest: Noop');
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults.length).to.equal(1);
      expect(searchResults[0].name).to.equal(`${createdAlert.name}Test: Noop`);
      expect(searchResults[0].interval).to.equal('1 min');
      expect(searchResults[0].tags).to.equal('2');
      expect(searchResults[0].duration).to.match(/\d{2,}:\d{2}/);
    });

    it('should update alert list on the search clear button click', async () => {
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'c', tags: [] },
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts('b');
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );
      await retry.try(async () => {
        const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(searchResults.length).to.equal(1);
        expect(searchResults[0].name).to.equal('bTest: Noop');
        expect(searchResults[0].interval).to.equal('1 min');
        expect(searchResults[0].tags).to.equal('2');
        expect(searchResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });

      const searchClearButton = await find.byCssSelector('.euiFormControlLayoutClearButton');
      await searchClearButton.click();
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );

      await retry.try(async () => {
        const searchResultsAfterClear = await pageObjects.triggersActionsUI.getAlertsList();
        expect(searchResultsAfterClear.length).to.equal(2);
        expect(searchResultsAfterClear[0].name).to.equal('bTest: Noop');
        expect(searchResultsAfterClear[0].interval).to.equal('1 min');
        expect(searchResultsAfterClear[0].tags).to.equal('2');
        expect(searchResultsAfterClear[0].duration).to.match(/\d{2,}:\d{2}/);
        expect(searchResultsAfterClear[1].name).to.equal('cTest: Noop');
        expect(searchResultsAfterClear[1].interval).to.equal('1 min');
        expect(searchResultsAfterClear[1].tags).to.equal('');
        expect(searchResultsAfterClear[1].duration).to.match(/\d{2,}:\d{2}/);
      });
    });

    it('should search for tags', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
        overwrites: { tags: ['tag', 'tagtag', 'taggity tag'] },
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`${createdAlert.name} tag`);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults.length).to.equal(1);
      expect(searchResults[0].name).to.equal(`${createdAlert.name}Test: Noop`);
      expect(searchResults[0].interval).to.equal('1 min');
      expect(searchResults[0].tags).to.equal('3');
      expect(searchResults[0].duration).to.match(/\d{2,}:\d{2}/);
    });

    it('should display an empty list when search did not return any alerts', async () => {
      await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`An Alert That For Sure Doesn't Exist!`);

      expect(await pageObjects.triggersActionsUI.isAlertsListDisplayed()).to.eql(true);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('disableButton');

      await testSubjects.click('confirmModalConfirmButton');

      await refreshAlertsList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');

      await pageObjects.triggersActionsUI.ensureRuleActionStatusApplied(
        createdAlert.name,
        'statusDropdown',
        'disabled'
      );
    });

    it('should untrack disable rule if untrack switch is true', async () => {
      const { body: createdRule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            rule_type_id: 'test.always-firing',
            schedule: { interval: '24h' },
            params: {
              instances: [{ id: 'alert-id' }],
            },
          })
        )
        .expect(200);

      objectRemover.add(createdRule.id, 'alert', 'alerts');

      await retry.try(async () => {
        const { alerts: alertInstances } = await getAlertSummary(createdRule.id);
        expect(Object.keys(alertInstances).length).to.eql(1);
        expect(alertInstances['alert-id'].tracked).to.eql(true);
      });

      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdRule.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('disableButton');

      await testSubjects.click('untrackAlertsModalSwitch');

      await testSubjects.click('confirmModalConfirmButton');

      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const { alerts: alertInstances } = await getAlertSummary(createdRule.id);
        expect(alertInstances['alert-id'].tracked).to.eql(false);
      });
    });

    it('should not untrack disable rule if untrack switch if false', async () => {
      const { body: createdRule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            rule_type_id: 'test.always-firing',
            schedule: { interval: '24h' },
            params: {
              instances: [{ id: 'alert-id' }],
            },
          })
        )
        .expect(200);

      objectRemover.add(createdRule.id, 'alert', 'alerts');

      await retry.try(async () => {
        const { alerts: alertInstances } = await getAlertSummary(createdRule.id);
        expect(Object.keys(alertInstances).length).to.eql(1);
        expect(alertInstances['alert-id'].tracked).to.eql(true);
      });

      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdRule.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('disableButton');

      await testSubjects.click('confirmModalConfirmButton');

      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const { alerts: alertInstances } = await getAlertSummary(createdRule.id);
        expect(alertInstances['alert-id'].tracked).to.eql(true);
      });
    });

    it('should re-enable single alert', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await retry.waitForWithTimeout('disable button to show up', 30000, async () => {
        return await testSubjects.isDisplayed('disableButton');
      });

      await testSubjects.click('disableButton');

      await testSubjects.click('confirmModalConfirmButton');

      await header.waitUntilLoadingHasFinished();

      await pageObjects.triggersActionsUI.ensureRuleActionStatusApplied(
        createdAlert.name,
        'statusDropdown',
        'disabled'
      );

      await testSubjects.click('collapsedItemActions');

      await retry.waitForWithTimeout('disable button to show up', 30000, async () => {
        return await testSubjects.isDisplayed('disableButton');
      });

      await testSubjects.click('disableButton');

      await header.waitUntilLoadingHasFinished();

      await pageObjects.triggersActionsUI.ensureRuleActionStatusApplied(
        createdAlert.name,
        'statusDropdown',
        'enabled'
      );
    });

    it('should delete single alert', async () => {
      await createAlert({
        supertest,
        objectRemover,
      });
      const secondAlert = await createAlertManualCleanup({ supertest });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('deleteRule');
      await testSubjects.exists('rulesDeleteIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Deleted 1 rule');
      });

      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert({ supertest, objectRemover });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkDisable');

      await testSubjects.click('confirmModalConfirmButton');

      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Disabled 1 rule');
      });

      await pageObjects.triggersActionsUI.ensureRuleActionStatusApplied(
        createdAlert.name,
        'statusDropdown',
        'disabled'
      );
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert({ supertest, objectRemover });
      await disableAlert({ supertest, alertId: createdAlert.id });

      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkEnable');

      await pageObjects.triggersActionsUI.ensureRuleActionStatusApplied(
        createdAlert.name,
        'statusDropdown',
        'enabled'
      );
    });

    it('should render percentile column and cells correctly', async () => {
      await createAlert({ supertest, objectRemover });
      await refreshAlertsList();

      await testSubjects.existOrFail('rulesTable-P50ColumnName');
      await testSubjects.existOrFail('P50Percentile');

      await retry.try(async () => {
        const percentileCell = await find.byCssSelector(
          '[data-test-subj="P50Percentile"]:nth-of-type(1)'
        );
        const percentileCellText = await percentileCell.getVisibleText();
        expect(percentileCellText).to.match(/^N\/A|\d{2,}:\d{2}$/);

        await testSubjects.click('percentileSelectablePopover-iconButton');
        await testSubjects.existOrFail('percentileSelectablePopover-selectable');
        const searchClearButton = await find.byCssSelector(
          '[data-test-subj="percentileSelectablePopover-selectable"] li:nth-child(2)'
        );
        const alertResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(alertResults[0].duration).to.match(/^N\/A|\d{2,}:\d{2}$/);

        await searchClearButton.click();
        await testSubjects.missingOrFail('percentileSelectablePopover-selectable');
        await testSubjects.existOrFail('rulesTable-P95ColumnName');
        await testSubjects.existOrFail('P95Percentile');
      });
    });

    it('should render interval info icon when schedule interval is less than configured minimum', async () => {
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b', schedule: { interval: '1s' } },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'c' },
      });
      await refreshAlertsList();

      await testSubjects.existOrFail('ruleInterval-config-icon-0');
      await testSubjects.missingOrFail('ruleInterval-config-icon-1');

      // open edit flyout when icon is clicked
      const infoIcon = await testSubjects.find('ruleInterval-config-icon-0');
      await infoIcon.click();

      await testSubjects.click('cancelSaveEditedRuleButton');
    });

    it('should delete all selection', async () => {
      const namePrefix = generateUniqueKey();
      const createdAlert = await createAlertManualCleanup({
        supertest,
        overwrites: { name: `${namePrefix}-1` },
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('bulkDelete');
      await testSubjects.exists('rulesDeleteIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Deleted 1 rule');
      });

      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete).to.have.length(0);
    });

    it('should filter alerts by the status', async () => {
      await createAlert({ supertest, objectRemover });
      const failingAlert = await createFailingAlert({ supertest, objectRemover });
      // initialy alert get Pending status, so we need to retry refresh list logic to get the post execution statuses
      await retry.try(async () => {
        await refreshAlertsList();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults.map((item: any) => item.status).sort()).to.eql([
          'Failed',
          'Succeeded',
        ]);
      });
      await refreshAlertsList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await testSubjects.click('ruleLastRunOutcomeFilterButton');
      await testSubjects.click('ruleLastRunOutcomefailedFilterOption'); // select Error status filter
      await retry.try(async () => {
        const filterErrorOnlyResults =
          await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(filterErrorOnlyResults.length).to.equal(1);
        expect(filterErrorOnlyResults[0].name).to.equal(`${failingAlert.name}Test: Failing`);
        expect(filterErrorOnlyResults[0].interval).to.equal('30 sec');
        expect(filterErrorOnlyResults[0].status).to.equal('Failed');
        expect(filterErrorOnlyResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });
    });

    it('should display total alerts by status and error banner only when exists alerts with status error', async () => {
      const createdAlert = await createAlert({ supertest, objectRemover });
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults.length).to.equal(1);
        expect(refreshResults[0].name).to.equal(`${createdAlert.name}Test: Noop`);
        expect(refreshResults[0].interval).to.equal('1 min');
        expect(refreshResults[0].status).to.equal('Succeeded');
        expect(refreshResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });

      const alertsErrorBannerWhenNoErrors = await find.allByCssSelector(
        '[data-test-subj="rulesErrorBanner"]'
      );
      expect(alertsErrorBannerWhenNoErrors).to.have.length(0);

      await createFailingAlert({ supertest, objectRemover });
      await retry.try(async () => {
        await refreshAlertsList();
        const alertsErrorBannerExistErrors = await find.allByCssSelector(
          '[data-test-subj="rulesErrorBanner"]'
        );
        expect(alertsErrorBannerExistErrors).to.have.length(1);
        expect(
          await (await alertsErrorBannerExistErrors[0].findByTagName('p')).getVisibleText()
        ).to.equal(' Error found in 1 rule. Show rule with error');
      });

      await retry.try(async () => {
        await refreshAlertsList();
        expect(await testSubjects.getVisibleText('totalRulesCount')).to.be('2 rules');
        expect(await testSubjects.getVisibleText('totalSucceededRulesCount')).to.be('Succeeded: 1');
        expect(await testSubjects.getVisibleText('totalFailedRulesCount')).to.be('Failed: 1');
        expect(await testSubjects.getVisibleText('totalWarningRulesCount')).to.be('Warning: 0');
      });
    });

    it('Expand error in rules table when there is rule with an error associated', async () => {
      const createdAlert = await createAlert({ supertest, objectRemover });
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults.length).to.equal(1);
        expect(refreshResults[0].name).to.equal(`${createdAlert.name}Test: Noop`);
        expect(refreshResults[0].interval).to.equal('1 min');
        expect(refreshResults[0].status).to.equal('Succeeded');
        expect(refreshResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });

      let expandRulesErrorLink = await find.allByCssSelector('[data-test-subj="expandRulesError"]');
      expect(expandRulesErrorLink).to.have.length(0);

      await createFailingAlert({ supertest, objectRemover });
      await retry.try(async () => {
        await refreshAlertsList();
        expandRulesErrorLink = await find.allByCssSelector('[data-test-subj="expandRulesError"]');
        expect(expandRulesErrorLink).to.have.length(1);
      });
      await refreshAlertsList();
      await testSubjects.click('expandRulesError');
      const expandedRow = await find.allByCssSelector('.euiTableRow-isExpandedRow');
      expect(expandedRow).to.have.length(1);
      expect(await (await expandedRow[0].findByTagName('div')).getVisibleText()).to.equal(
        'Error from last run\nFailed to execute alert type'
      );
    });

    it('should filter alerts by the alert type', async () => {
      await createAlert({ supertest, objectRemover });
      const failingAlert = await createFailingAlert({ supertest, objectRemover });
      await refreshAlertsList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await testSubjects.click('ruleTypeFilterButton');

      await retry.try(async () => {
        const isOpen = await testSubjects.exists('ruleType0Group');
        if (!isOpen) {
          await testSubjects.click('ruleTypeFilterButton');
        }
        expect(await (await testSubjects.find('ruleType0Group')).getVisibleText()).to.eql('Alerts');
      });

      await testSubjects.click('ruleTypetest.failingFilterOption');

      await retry.try(async () => {
        const filterFailingAlertOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterFailingAlertOnlyResults.length).to.equal(1);
        expect(filterFailingAlertOnlyResults[0].name).to.equal(`${failingAlert.name}Test: Failing`);
        expect(filterFailingAlertOnlyResults[0].interval).to.equal('30 sec');
        expect(filterFailingAlertOnlyResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });
    });

    it('should filter alerts by the action type', async () => {
      await createAlert({
        supertest,
        objectRemover,
      });
      const action = await createConnector({ supertest, objectRemover });
      const noopAlertWithAction = await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          actions: [
            {
              id: action.id,
              group: 'default',
              params: { level: 'info', message: 'gfghfhg' },
              frequency: {
                summary: false,
                notify_when: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      });
      await refreshAlertsList();
      await testSubjects.click('actionTypeFilterButton');
      await testSubjects.click('actionType.slackFilterOption');

      await retry.try(async () => {
        const filterWithSlackOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterWithSlackOnlyResults.length).to.equal(1);
        expect(filterWithSlackOnlyResults[0].name).to.equal(
          `${noopAlertWithAction.name}Test: Noop`
        );
        expect(filterWithSlackOnlyResults[0].interval).to.equal('1 min');
        expect(filterWithSlackOnlyResults[0].duration).to.match(/\d{2,}:\d{2}/);
      });

      await refreshAlertsList();

      // de-select action type filter
      await testSubjects.click('actionTypeFilterButton');
      await testSubjects.click('actionType.slackFilterOption');

      await testSubjects.missingOrFail('centerJustifiedSpinner');
    });

    it('should filter alerts by the rule status', async () => {
      // Enabled alert
      await createAlert({
        supertest,
        objectRemover,
      });

      const disabledAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await disableAlert({
        supertest,
        alertId: disabledAlert.id,
      });

      const snoozedAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await snoozeAlert({
        supertest,
        alertId: snoozedAlert.id,
      });

      const snoozedAndDisabledAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await snoozeAlert({
        supertest,
        alertId: snoozedAndDisabledAlert.id,
      });
      await disableAlert({
        supertest,
        alertId: snoozedAndDisabledAlert.id,
      });

      await refreshAlertsList();
      await assertRulesLength(4);

      // Select only enabled
      await testSubjects.click('ruleStatusFilterButton');
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select enabled or disabled (e.g. all)
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);

      // Select only disabled
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select only snoozed
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await testSubjects.click('ruleStatusFilterOption-snoozed');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select disabled or snoozed
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(3);

      // Select enabled or disabled or snoozed
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);
    });

    it('should filter alerts by the tag', async () => {
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          tags: ['a'],
        },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          tags: ['b'],
        },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          tags: ['a', 'b'],
        },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          tags: ['b', 'c'],
        },
      });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          tags: ['c'],
        },
      });

      await refreshAlertsList();
      await testSubjects.click('ruleTagFilter');

      // Select a -> selected: a
      await testSubjects.click('ruleTagFilterOption-a');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Unselect a -> selected: none
      await testSubjects.click('ruleTagFilterOption-a');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(5);

      // Select a, b -> selected: a, b
      await testSubjects.click('ruleTagFilterOption-a');
      await testSubjects.click('ruleTagFilterOption-b');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);

      // Unselect a, b, select c -> selected: c
      await testSubjects.click('ruleTagFilterOption-a');
      await testSubjects.click('ruleTagFilterOption-b');
      await testSubjects.click('ruleTagFilterOption-c');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);
    });

    it('should not prevent rules with action execution capabilities from being edited', async () => {
      const action = await createConnector({ supertest, objectRemover });
      await createAlert({
        supertest,
        objectRemover,
        overwrites: {
          actions: [
            {
              id: action.id,
              group: 'default',
              params: { level: 'info', message: 'gfghfhg' },
              frequency: {
                summary: false,
                notify_when: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      });
      await refreshAlertsList();
      await retry.try(async () => {
        const actionButton = await testSubjects.find('selectActionButton');
        const disabled = await actionButton.getAttribute('disabled');
        expect(disabled).to.equal(null);
      });
    });

    it('should allow rules to be snoozed using the right side dropdown', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });

      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeApply');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-unsnoozed"]:not(.euiButton-isDisabled)'
      );
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
    });

    it('should allow rules to be snoozed indefinitely using the right side dropdown', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeIndefiniteApply');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-unsnoozed"]:not(.euiButton-isDisabled)'
      );
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozedIndefinitely');
    });

    it('should allow snoozed rules to be unsnoozed using the right side dropdown', async () => {
      const createdAlert = await createAlert({
        supertest,
        objectRemover,
      });

      await snoozeAlert({
        supertest,
        alertId: createdAlert.id,
      });

      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeCancel');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-snoozed"]:not(.euiButton-isDisabled)'
      );
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozed');
      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozedIndefinitely');
    });
  });
};
