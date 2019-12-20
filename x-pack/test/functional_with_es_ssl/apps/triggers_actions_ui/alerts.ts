/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

function generateUniqueKey() {
  return uuid.v4().replace(/-/g, '');
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');

  async function createAlert() {
    const { body: createdAlert } = await supertest
      .post(`/api/alert`)
      .set('kbn-xsrf', 'foo')
      .send({
        enabled: true,
        name: generateUniqueKey(),
        tags: ['foo', 'bar'],
        alertTypeId: 'test.noop',
        interval: '1m',
        throttle: '1m',
        actions: [],
        params: {},
      })
      .expect(200);
    return createdAlert;
  }

  describe('alerts', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      const alertsTab = await testSubjects.find('alertsTab');
      await alertsTab.click();
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert();

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

    it('should search for tags', async () => {
      const createdAlert = await createAlert();

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

    // Flaky until https://github.com/elastic/eui/issues/2612 fixed
    it.skip('should disable single alert', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const enableSwitch = await testSubjects.find('enableSwitch');
      await enableSwitch.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterDisable = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterDisable.click();

      const enableSwitchAfterDisable = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitchAfterDisable.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    // Flaky until https://github.com/elastic/eui/issues/2612 fixed
    it.skip('should re-enable single alert', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const enableSwitch = await testSubjects.find('enableSwitch');
      await enableSwitch.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterDisable = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterDisable.click();

      const enableSwitchAfterDisable = await testSubjects.find('enableSwitch');
      await enableSwitchAfterDisable.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterReEnable = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterReEnable.click();

      const enableSwitchAfterReEnable = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitchAfterReEnable.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    // Flaky until https://github.com/elastic/eui/issues/2612 fixed
    it.skip('should mute single alert', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const muteSwitch = await testSubjects.find('muteSwitch');
      await muteSwitch.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterMute = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterMute.click();

      const muteSwitchAfterMute = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitchAfterMute.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    // Flaky until https://github.com/elastic/eui/issues/2612 fixed
    it.skip('should unmute single alert', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const muteSwitch = await testSubjects.find('muteSwitch');
      await muteSwitch.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterMute = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterMute.click();

      const muteSwitchAfterMute = await testSubjects.find('muteSwitch');
      await muteSwitchAfterMute.click();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActionsAfterUnmute = await testSubjects.find('collapsedItemActions');
      await collapsedItemActionsAfterUnmute.click();

      const muteSwitchAfterUnmute = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitchAfterUnmute.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should delete single alert', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const deleteBtn = await testSubjects.find('deleteAlert');
      await deleteBtn.click();

      retry.try(async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

        const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(searchResults.length).to.eql(0);
      });
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const muteAllBtn = await testSubjects.find('muteAll');
      await muteAllBtn.click();

      // Unmute all button shows after clicking mute all
      await testSubjects.existOrFail('unmuteAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const muteSwitch = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should unmute all selection', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const muteAllBtn = await testSubjects.find('muteAll');
      await muteAllBtn.click();

      const unmuteAllBtn = await testSubjects.find('unmuteAll');
      await unmuteAllBtn.click();

      // Mute all button shows after clicking unmute all
      await testSubjects.existOrFail('muteAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const muteSwitch = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const disableAllBtn = await testSubjects.find('disableAll');
      await disableAllBtn.click();

      // Enable all button shows after clicking disable all
      await testSubjects.existOrFail('enableAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const enableSwitch = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const disableAllBtn = await testSubjects.find('disableAll');
      await disableAllBtn.click();

      const enableAllBtn = await testSubjects.find('enableAll');
      await enableAllBtn.click();

      // Disable all button shows after clicking enable all
      await testSubjects.existOrFail('disableAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const enableSwitch = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should delete all selection', async () => {
      const createdAlert = await createAlert();

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const deleteAllBtn = await testSubjects.find('deleteAll');
      await deleteAllBtn.click();

      retry.try(async () => {
        await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

        const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(searchResults.length).to.eql(0);
      });
    });
  });
};
