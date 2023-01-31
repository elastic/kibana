/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { createAlert } from '../../lib/alert_api_actions';
import { ObjectRemover } from '../../lib/object_remover';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'security']);
  const browser = getService('browser');
  const objectRemover = new ObjectRemover(supertest);
  const retry = getService('retry');

  async function refreshAlertsList() {
    await retry.try(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('triggersActions');
      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(1);
    });
  }

  async function dragRangeInput(
    testId: string,
    steps: number = 1,
    direction: 'left' | 'right' = 'right'
  ) {
    const inputEl = await testSubjects.find(testId);
    await inputEl.focus();
    const browserKey = direction === 'left' ? browser.keys.LEFT : browser.keys.RIGHT;
    while (steps--) {
      await browser.pressKeys(browserKey);
    }
  }

  describe('rules settings modal', () => {
    before(async () => {
      await supertest
        .post(`/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          lookBackWindow: 10,
          statusChangeThreshold: 10,
        })
        .expect(200);
    });

    beforeEach(async () => {
      await createAlert({
        supertest,
        objectRemover,
      });
      await refreshAlertsList();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('rules settings link should be enabled', async () => {
      await testSubjects.existOrFail('rulesSettingsLink');
      const button = await testSubjects.find('rulesSettingsLink');
      const isDisabled = await button.getAttribute('disabled');
      expect(isDisabled).to.equal(null);
    });

    it('should allow the user to open up the rules settings modal', async () => {
      await testSubjects.click('rulesSettingsLink');
      await testSubjects.existOrFail('rulesSettingsModal');
      await testSubjects.waitForDeleted('centerJustifiedSpinner');

      // Flapping enabled by default
      await testSubjects.missingOrFail('rulesSettingsModalFlappingOffPrompt');

      await testSubjects.existOrFail('rulesSettingsModalEnableSwitch');
      await testSubjects.existOrFail('lookBackWindowRangeInput');
      await testSubjects.existOrFail('statusChangeThresholdRangeInput');

      const lookBackWindowInput = await testSubjects.find('lookBackWindowRangeInput');
      const statusChangeThresholdInput = await testSubjects.find('statusChangeThresholdRangeInput');

      const lookBackWindowValue = await lookBackWindowInput.getAttribute('value');
      const statusChangeThresholdValue = await statusChangeThresholdInput.getAttribute('value');

      expect(lookBackWindowValue).to.eql('10');
      expect(statusChangeThresholdValue).to.eql('10');
    });

    it('should allow the user to modify rules settings', async () => {
      await testSubjects.click('rulesSettingsLink');
      await testSubjects.waitForDeleted('centerJustifiedSpinner');

      await dragRangeInput('lookBackWindowRangeInput', 5, 'right');
      await dragRangeInput('statusChangeThresholdRangeInput', 5, 'left');

      let lookBackWindowInput = await testSubjects.find('lookBackWindowRangeInput');
      let statusChangeThresholdInput = await testSubjects.find('statusChangeThresholdRangeInput');

      let lookBackWindowValue = await lookBackWindowInput.getAttribute('value');
      let statusChangeThresholdValue = await statusChangeThresholdInput.getAttribute('value');

      expect(lookBackWindowValue).to.eql('15');
      expect(statusChangeThresholdValue).to.eql('5');

      await testSubjects.click('rulesSettingsModalEnableSwitch');
      await testSubjects.existOrFail('rulesSettingsModalFlappingOffPrompt');

      // Save
      await testSubjects.click('rulesSettingsModalSaveButton');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('rulesSettingsModal');

      // Open up the modal again
      await testSubjects.click('rulesSettingsLink');
      await testSubjects.waitForDeleted('centerJustifiedSpinner');

      // Flapping initially disabled
      await testSubjects.existOrFail('rulesSettingsModalFlappingOffPrompt');
      await testSubjects.click('rulesSettingsModalEnableSwitch');

      lookBackWindowInput = await testSubjects.find('lookBackWindowRangeInput');
      statusChangeThresholdInput = await testSubjects.find('statusChangeThresholdRangeInput');

      lookBackWindowValue = await lookBackWindowInput.getAttribute('value');
      statusChangeThresholdValue = await statusChangeThresholdInput.getAttribute('value');

      expect(lookBackWindowValue).to.eql('15');
      expect(statusChangeThresholdValue).to.eql('5');
    });
  });
};
