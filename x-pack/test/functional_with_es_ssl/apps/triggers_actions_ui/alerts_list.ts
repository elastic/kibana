/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { generateUniqueKey, getTestAlertData, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  async function createAlertManualCleanup(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestAlertData(overwrites))
      .expect(200);
    return createdAlert;
  }

  async function createFailingAlert() {
    return await createAlert({
      rule_type_id: 'test.failing',
      schedule: { interval: '30s' },
    });
  }

  async function createAlert(overwrites: Record<string, any> = {}) {
    const createdAlert = await createAlertManualCleanup(overwrites);
    objectRemover.add(createdAlert.id, 'alert', 'alerts');
    return createdAlert;
  }

  async function createAction(overwrites: Record<string, any> = {}) {
    const { body: createdAction } = await supertest
      .post(`/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send(getTestActionData(overwrites))
      .expect(200);
    objectRemover.add(createdAction.id, 'action', 'actions');
    return createdAction;
  }

  async function muteAlert(alertId: string) {
    const { body: alert } = await supertest
      .post(`/api/alerting/rule/${alertId}/_mute_all`)
      .set('kbn-xsrf', 'foo');
    return alert;
  }

  async function disableAlert(alertId: string) {
    const { body: alert } = await supertest
      .post(`/api/alerting/rule/${alertId}/_disable`)
      .set('kbn-xsrf', 'foo');
    return alert;
  }

  async function refreshAlertsList() {
    await testSubjects.click('rulesTab');
  }

  describe('alerts list', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should display alerts in alphabetical order', async () => {
      const uniqueKey = generateUniqueKey();
      await createAlert({ name: 'b', tags: [uniqueKey] });
      await createAlert({ name: 'c', tags: [uniqueKey] });
      await createAlert({ name: 'a', tags: [uniqueKey] });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(uniqueKey);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(3);
      expect(searchResults[0].name).to.eql('a');
      expect(searchResults[1].name).to.eql('b');
      expect(searchResults[2].name).to.eql('c');
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
    });

    it('should update alert list on the search clear button click', async () => {
      await createAlert({ name: 'b' });
      await createAlert({ name: 'c' });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts('b');

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: 'b',
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
      const searchClearButton = await find.byCssSelector('.euiFormControlLayoutClearButton');
      await searchClearButton.click();
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="alertsList"]:not(.euiBasicTable-loading)'
      );
      const searchResultsAfterClear = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterClear).to.eql([
        {
          name: 'b',
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
        {
          name: 'c',
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
    });

    it('should search for tags', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`${createdAlert.name} foo`);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
    });

    it('should display an empty list when search did not return any alerts', async () => {
      await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`An Alert That For Sure Doesn't Exist!`);

      expect(await pageObjects.triggersActionsUI.isAlertsListDisplayed()).to.eql(true);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('disableButton');

      await pageObjects.triggersActionsUI.ensureRuleActionToggleApplied(
        createdAlert.name,
        'enableSwitch',
        'true'
      );
    });

    it('should re-enable single alert', async () => {
      const createdAlert = await createAlert();
      await disableAlert(createdAlert.id);
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('disableButton');
      await pageObjects.triggersActionsUI.ensureRuleActionToggleApplied(
        createdAlert.name,
        'enableSwitch',
        'false'
      );
    });

    it('should mute single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('muteButton');

      await retry.tryForTime(30000, async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
        const muteBadge = await testSubjects.find('mutedActionsBadge');
        expect(await muteBadge.isDisplayed()).to.eql(true);
      });
    });

    it('should unmute single alert', async () => {
      const createdAlert = await createAlert();
      await muteAlert(createdAlert.id);
      await refreshAlertsList();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('muteButton');
      await retry.tryForTime(30000, async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
        await testSubjects.missingOrFail('mutedActionsBadge');
      });
    });

    it('should delete single alert', async () => {
      await createAlert();
      const secondAlert = await createAlertManualCleanup();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('deleteAlert');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 rule');
      });

      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('muteAll');

      // Unmute all button shows after clicking mute all
      await testSubjects.existOrFail('unmuteAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await retry.tryForTime(30000, async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
        const muteBadge = await testSubjects.find('mutedActionsBadge');
        expect(await muteBadge.isDisplayed()).to.eql(true);
      });
    });

    it('should unmute all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('muteAll');

      await testSubjects.click('unmuteAll');

      // Mute all button shows after clicking unmute all
      await testSubjects.existOrFail('muteAll');

      await retry.tryForTime(30000, async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
        await testSubjects.missingOrFail('mutedActionsBadge');
      });
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('disableAll');

      // Enable all button shows after clicking disable all
      await testSubjects.existOrFail('enableAll');

      await pageObjects.triggersActionsUI.ensureRuleActionToggleApplied(
        createdAlert.name,
        'enableSwitch',
        'false'
      );
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('disableAll');

      await testSubjects.click('enableAll');

      // Disable all button shows after clicking enable all
      await testSubjects.existOrFail('disableAll');

      await pageObjects.triggersActionsUI.ensureRuleActionToggleApplied(
        createdAlert.name,
        'enableSwitch',
        'true'
      );
    });

    it('should delete all selection', async () => {
      const namePrefix = generateUniqueKey();
      const createdAlert = await createAlertManualCleanup({ name: `${namePrefix}-1` });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('deleteAll');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 rule');
      });

      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete).to.have.length(0);
    });

    it('should filter alerts by the status', async () => {
      await createAlert();
      const failingAlert = await createFailingAlert();
      // initialy alert get Pending status, so we need to retry refresh list logic to get the post execution statuses
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults.map((item: any) => item.status).sort()).to.eql(['Error', 'Ok']);
      });
      await testSubjects.click('alertStatusFilterButton');
      await testSubjects.click('alertStatuserrorFilerOption'); // select Error status filter
      await retry.try(async () => {
        const filterErrorOnlyResults =
          await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(filterErrorOnlyResults).to.eql([
          {
            name: failingAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Failing',
            interval: '30s',
            status: 'Error',
          },
        ]);
      });
    });

    it('should display total alerts by status and error banner only when exists alerts with status error', async () => {
      const createdAlert = await createAlert();
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults).to.eql([
          {
            name: createdAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Noop',
            interval: '1m',
            status: 'Ok',
          },
        ]);
      });

      const alertsErrorBannerWhenNoErrors = await find.allByCssSelector(
        '[data-test-subj="alertsErrorBanner"]'
      );
      expect(alertsErrorBannerWhenNoErrors).to.have.length(0);

      await createFailingAlert();
      await retry.try(async () => {
        await refreshAlertsList();
        const alertsErrorBannerExistErrors = await find.allByCssSelector(
          '[data-test-subj="alertsErrorBanner"]'
        );
        expect(alertsErrorBannerExistErrors).to.have.length(1);
        expect(
          await (
            await alertsErrorBannerExistErrors[0].findByCssSelector('.euiCallOutHeader')
          ).getVisibleText()
        ).to.equal('Error found in 1 rule.');
      });

      await refreshAlertsList();
      expect(await testSubjects.getVisibleText('totalAlertsCount')).to.be('Showing: 2 of 2 rules.');
      expect(await testSubjects.getVisibleText('totalActiveAlertsCount')).to.be('Active: 0');
      expect(await testSubjects.getVisibleText('totalOkAlertsCount')).to.be('Ok: 1');
      expect(await testSubjects.getVisibleText('totalErrorAlertsCount')).to.be('Error: 1');
      expect(await testSubjects.getVisibleText('totalPendingAlertsCount')).to.be('Pending: 0');
      expect(await testSubjects.getVisibleText('totalUnknownAlertsCount')).to.be('Unknown: 0');
    });

    it('should filter alerts by the alert type', async () => {
      await createAlert();
      const failingAlert = await createFailingAlert();
      await refreshAlertsList();
      await testSubjects.click('alertTypeFilterButton');
      expect(await (await testSubjects.find('alertType0Group')).getVisibleText()).to.eql('Alerts');
      await testSubjects.click('alertTypetest.failingFilterOption');

      await retry.try(async () => {
        const filterFailingAlertOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterFailingAlertOnlyResults).to.eql([
          {
            name: failingAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Failing',
            interval: '30s',
          },
        ]);
      });
    });

    it('should filter alerts by the action type', async () => {
      await createAlert();
      const action = await createAction();
      const noopAlertWithAction = await createAlert({
        actions: [
          {
            id: action.id,
            group: 'default',
            params: { level: 'info', message: 'gfghfhg' },
          },
        ],
      });
      await refreshAlertsList();
      await testSubjects.click('actionTypeFilterButton');
      await testSubjects.click('actionType.slackFilterOption');

      await retry.try(async () => {
        const filterWithSlackOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterWithSlackOnlyResults).to.eql([
          {
            name: noopAlertWithAction.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Noop',
            interval: '1m',
          },
        ]);
      });
    });
  });
};
