/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const ENTER_KEY = '\uE007';

function generateUniqueKey() {
  return uuid.v4().replace(/-/g, '');
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const supertest = getService('supertest');

  async function createAlert() {
    const { body: createdAlert } = await supertest
      .post(`/api/alert`)
      .set('kbn-xsrf', 'foo')
      .send({
        enabled: true,
        name: generateUniqueKey(),
        tags: ['foo'],
        alertTypeId: 'test',
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
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const rows = await testSubjects.findAll('alert-row');
      expect(rows.length).to.eql(1);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const enableSwitch = await testSubjects.find('enableSwitch');
      await enableSwitch.click();

      const searchBoxAfterUpdate = await find.byCssSelector(
        '[data-test-subj="alertsList"] .euiFieldSearch'
      );
      await searchBoxAfterUpdate.click();

      // TODO: More assertions
    });

    it('should re-enable single alert', async () => {
      // TODO
    });

    it('should mute single alert', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const muteSwitch = await testSubjects.find('muteSwitch');
      await muteSwitch.click();

      const searchBoxAfterUpdate = await find.byCssSelector(
        '[data-test-subj="alertsList"] .euiFieldSearch'
      );
      await searchBoxAfterUpdate.click();

      // TODO: More assertions
    });

    it('should unmute single alert', async () => {
      // TODO
    });

    it('should delete single alert', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const collapsedItemActions = await testSubjects.find('collapsedItemActions');
      await collapsedItemActions.click();

      const deleteBtn = await testSubjects.find('deleteAlert');
      await deleteBtn.click();

      // TODO: More assertions
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const muteAllBtn = await testSubjects.find('muteAll');
      await muteAllBtn.click();

      // Unmute all button shows after clicking mute all
      await testSubjects.existOrFail('unmuteAll');

      // TODO: More assertions
    });

    it('should unmute all selection', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

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

      // TODO: More assertions
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const disableAllBtn = await testSubjects.find('disableAll');
      await disableAllBtn.click();

      // Enable all button shows after clicking disable all
      await testSubjects.existOrFail('enableAll');

      // TODO: More assertions
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

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

      // TODO: More assertions
    });

    it('should delete all selection', async () => {
      const createdAlert = await createAlert();
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(createdAlert.name);
      await searchBox.pressKeys(ENTER_KEY);

      const checkbox = await testSubjects.find(`checkboxSelectRow-${createdAlert.id}`);
      await checkbox.click();

      const bulkActionBtn = await testSubjects.find('bulkAction');
      await bulkActionBtn.click();

      const deleteAllBtn = await testSubjects.find('deleteAll');
      await deleteAllBtn.click();

      // TODO: More assertions
    });
  });
};
