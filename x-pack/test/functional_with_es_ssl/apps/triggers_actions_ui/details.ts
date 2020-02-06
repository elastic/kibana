/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'alertDetailsUI']);
  const browser = getService('browser');
  const alerting = getService('alerting');

  describe('Alert Details', function() {
    const testRunUuid = uuid.v4();

    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');

      const actions = await Promise.all([
        alerting.actions.createAction({
          name: `server-log-${testRunUuid}-${0}`,
          actionTypeId: '.server-log',
          config: {},
          secrets: {},
        }),
        alerting.actions.createAction({
          name: `server-log-${testRunUuid}-${1}`,
          actionTypeId: '.server-log',
          config: {},
          secrets: {},
        }),
      ]);

      const alert = await alerting.alerts.createAlwaysFiringWithActions(
        `test-alert-${testRunUuid}`,
        actions.map(action => ({
          id: action.id,
          group: 'default',
          params: {
            message: 'from alert 1s',
            level: 'warn',
          },
        }))
      );

      // refresh to see alert
      await browser.refresh();

      await pageObjects.header.waitUntilLoadingHasFinished();

      // Verify content
      await testSubjects.existOrFail('alertsList');

      // click on first alert
      await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);
    });

    it('renders the alert details', async () => {
      const headingText = await pageObjects.alertDetailsUI.getHeadingText();
      expect(headingText).to.be(`test-alert-${testRunUuid}`);

      const alertType = await pageObjects.alertDetailsUI.getAlertType();
      expect(alertType).to.be(`Always Firing`);

      const { actionType, actionCount } = await pageObjects.alertDetailsUI.getActionsLabels();
      expect(actionType).to.be(`Server log`);
      expect(actionCount).to.be(`+1`);
    });

    it('should disable the alert', async () => {
      const enableSwitch = await testSubjects.find('enableSwitch');

      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');

      await enableSwitch.click();

      const enabledSwitchAfterDisabling = await testSubjects.find('enableSwitch');
      const isCheckedAfterDisabling = await enabledSwitchAfterDisabling.getAttribute(
        'aria-checked'
      );
      expect(isCheckedAfterDisabling).to.eql('false');
    });

    it('shouldnt allow you to mute a disabled alert', async () => {
      const disabledEnableSwitch = await testSubjects.find('enableSwitch');
      expect(await disabledEnableSwitch.getAttribute('aria-checked')).to.eql('false');

      const muteSwitch = await testSubjects.find('muteSwitch');
      expect(await muteSwitch.getAttribute('aria-checked')).to.eql('false');

      await muteSwitch.click();

      const muteSwitchAfterTryingToMute = await testSubjects.find('muteSwitch');
      const isDisabledMuteAfterDisabling = await muteSwitchAfterTryingToMute.getAttribute(
        'aria-checked'
      );
      expect(isDisabledMuteAfterDisabling).to.eql('false');
    });

    it('should reenable a disabled the alert', async () => {
      const enableSwitch = await testSubjects.find('enableSwitch');

      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');

      await enableSwitch.click();

      const enabledSwitchAfterReenabling = await testSubjects.find('enableSwitch');
      const isCheckedAfterDisabling = await enabledSwitchAfterReenabling.getAttribute(
        'aria-checked'
      );
      expect(isCheckedAfterDisabling).to.eql('true');
    });

    it('should mute the alert', async () => {
      const muteSwitch = await testSubjects.find('muteSwitch');

      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');

      await muteSwitch.click();

      const muteSwitchAfterDisabling = await testSubjects.find('muteSwitch');
      const isCheckedAfterDisabling = await muteSwitchAfterDisabling.getAttribute('aria-checked');
      expect(isCheckedAfterDisabling).to.eql('true');
    });

    it('should unmute the alert', async () => {
      const muteSwitch = await testSubjects.find('muteSwitch');

      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');

      await muteSwitch.click();

      const muteSwitchAfterUnmuting = await testSubjects.find('muteSwitch');
      const isCheckedAfterDisabling = await muteSwitchAfterUnmuting.getAttribute('aria-checked');
      expect(isCheckedAfterDisabling).to.eql('false');
    });
  });
};
