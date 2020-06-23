/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { omit, mapValues, range, flatten } from 'lodash';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'alertDetailsUI']);
  const browser = getService('browser');
  const log = getService('log');
  const alerting = getService('alerting');
  const retry = getService('retry');
  const find = getService('find');

  describe('Alert Details', function () {
    describe('Header', function () {
      const testRunUuid = uuid.v4();
      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const actions = await Promise.all([
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${0}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${1}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
        ]);

        const alert = await alerting.alerts.createAlwaysFiringWithActions(
          `test-alert-${testRunUuid}`,
          actions.map((action) => ({
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

        const { actionType } = await pageObjects.alertDetailsUI.getActionsLabels();
        expect(actionType).to.be(`Slack`);
      });

      it('should disable the alert', async () => {
        const disableSwitch = await testSubjects.find('disableSwitch');

        const isChecked = await disableSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('false');

        await disableSwitch.click();

        const disableSwitchAfterDisabling = await testSubjects.find('disableSwitch');
        const isCheckedAfterDisabling = await disableSwitchAfterDisabling.getAttribute(
          'aria-checked'
        );
        expect(isCheckedAfterDisabling).to.eql('true');
      });

      it('shouldnt allow you to mute a disabled alert', async () => {
        const disabledDisableSwitch = await testSubjects.find('disableSwitch');
        expect(await disabledDisableSwitch.getAttribute('aria-checked')).to.eql('true');

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
        const disableSwitch = await testSubjects.find('disableSwitch');

        const isChecked = await disableSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('true');

        await disableSwitch.click();

        const disableSwitchAfterReenabling = await testSubjects.find('disableSwitch');
        const isCheckedAfterDisabling = await disableSwitchAfterReenabling.getAttribute(
          'aria-checked'
        );
        expect(isCheckedAfterDisabling).to.eql('false');
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

    describe('Edit alert button', function () {
      const testRunUuid = uuid.v4();

      it('should open edit alert flyout', async () => {
        await pageObjects.common.navigateToApp('triggersActions');
        const params = {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        };
        const alert = await alerting.alerts.createAlertWithActions(
          testRunUuid,
          '.index-threshold',
          params,
          [
            {
              group: 'threshold met',
              id: 'my-server-log',
              params: { level: 'info', message: ' {{context.message}}' },
            },
          ]
        );
        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        const editButton = await testSubjects.find('openEditAlertFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

        const updatedAlertName = `Changed Alert Name ${uuid.v4()}`;
        await testSubjects.setValue('alertNameInput', updatedAlertName, {
          clearWithKeyboard: true,
        });

        await find.clickByCssSelector('[data-test-subj="saveEditedAlertButton"]:not(disabled)');

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql(`Updated '${updatedAlertName}'`);

        const headingText = await pageObjects.alertDetailsUI.getHeadingText();
        expect(headingText).to.be(updatedAlertName);
      });

      it('should reset alert when canceling an edit', async () => {
        await pageObjects.common.navigateToApp('triggersActions');
        const params = {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        };
        const alert = await alerting.alerts.createAlertWithActions(
          testRunUuid,
          '.index-threshold',
          params
        );
        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        const editButton = await testSubjects.find('openEditAlertFlyoutButton');
        await editButton.click();

        const updatedAlertName = `Changed Alert Name ${uuid.v4()}`;
        await testSubjects.setValue('alertNameInput', updatedAlertName, {
          clearWithKeyboard: true,
        });

        await testSubjects.click('cancelSaveEditedAlertButton');
        await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedAlertButton"]');

        await editButton.click();

        const nameInputAfterCancel = await testSubjects.find('alertNameInput');
        const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
        expect(textAfterCancel).to.eql(alert.name);
      });
    });

    describe('View In App', function () {
      const testRunUuid = uuid.v4();

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('triggersActions');
      });

      it('renders the alert details view in app button', async () => {
        const alert = await alerting.alerts.createNoOp(`test-alert-${testRunUuid}`);

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        expect(await pageObjects.alertDetailsUI.isViewInAppEnabled()).to.be(true);

        await pageObjects.alertDetailsUI.clickViewInApp();

        expect(await pageObjects.alertDetailsUI.getNoOpAppTitle()).to.be(`View Alert ${alert.id}`);
      });

      it('renders a disabled alert details view in app button', async () => {
        const alert = await alerting.alerts.createAlwaysFiringWithActions(
          `test-alert-disabled-nav`,
          []
        );

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        expect(await pageObjects.alertDetailsUI.isViewInAppDisabled()).to.be(true);
      });
    });

    describe('Alert Instances', function () {
      const testRunUuid = uuid.v4();
      let alert: any;

      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const actions = await Promise.all([
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${0}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${1}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
        ]);

        const instances = [{ id: 'us-central' }, { id: 'us-east' }, { id: 'us-west' }];
        alert = await alerting.alerts.createAlwaysFiringWithActions(
          `test-alert-${testRunUuid}`,
          actions.map((action) => ({
            id: action.id,
            group: 'default',
            params: {
              message: 'from alert 1s',
              level: 'warn',
            },
          })),
          {
            instances,
          }
        );

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { alertInstances } = await alerting.alerts.getAlertState(alert.id);
          expect(Object.keys(alertInstances).length).to.eql(instances.length);
        });
      });

      it('renders the active alert instances', async () => {
        // refresh to ensure Api call and UI are looking at freshest output
        await browser.refresh();

        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const { alertInstances } = await alerting.alerts.getAlertState(alert.id);

        const dateOnAllInstancesFromApiResponse = mapValues(
          alertInstances,
          ({
            meta: {
              lastScheduledActions: { date },
            },
          }) => date
        );

        log.debug(
          `API RESULT: ${Object.entries(dateOnAllInstancesFromApiResponse)
            .map(([id, date]) => `${id}: ${moment(date).utc()}`)
            .join(', ')}`
        );

        const instancesList = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(instancesList.map((instance) => omit(instance, 'duration'))).to.eql([
          {
            instance: 'us-central',
            status: 'Active',
            start: moment(dateOnAllInstancesFromApiResponse['us-central'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            instance: 'us-east',
            status: 'Active',
            start: moment(dateOnAllInstancesFromApiResponse['us-east'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            instance: 'us-west',
            status: 'Active',
            start: moment(dateOnAllInstancesFromApiResponse['us-west'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
        ]);

        const durationEpoch = moment(
          await pageObjects.alertDetailsUI.getAlertInstanceDurationEpoch()
        ).utc();

        log.debug(`DURATION EPOCH is: ${durationEpoch}]`);

        const durationFromInstanceInApiUntilPageLoad = mapValues(
          dateOnAllInstancesFromApiResponse,
          // time from Alert Instance until pageload (AKA durationEpoch)
          (date) => {
            const durationFromApiResuiltToEpoch = moment.duration(
              durationEpoch.diff(moment(date).utc())
            );
            // The UI removes milliseconds, so lets do the same in the test so we can compare
            return moment.duration({
              hours: durationFromApiResuiltToEpoch.hours(),
              minutes: durationFromApiResuiltToEpoch.minutes(),
              seconds: durationFromApiResuiltToEpoch.seconds(),
            });
          }
        );

        instancesList
          .map((alertInstance) => ({
            id: alertInstance.instance,
            // time from Alert Instance used to render the list until pageload (AKA durationEpoch)
            duration: moment.duration(alertInstance.duration),
          }))
          .forEach(({ id, duration: durationAsItAppearsOnList }) => {
            log.debug(
              `DURATION of ${id} [From UI: ${durationAsItAppearsOnList.as(
                'seconds'
              )} seconds] [From API: ${durationFromInstanceInApiUntilPageLoad[id].as(
                'seconds'
              )} seconds]`
            );

            expect(durationFromInstanceInApiUntilPageLoad[id].as('seconds')).to.equal(
              durationAsItAppearsOnList.as('seconds')
            );
          });
      });

      it('renders the muted inactive alert instances', async () => {
        // mute an alert instance that doesn't exist
        await alerting.alerts.muteAlertInstance(alert.id, 'eu-east');

        // refresh to see alert
        await browser.refresh();

        const instancesList = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(
          instancesList.filter((alertInstance) => alertInstance.instance === 'eu-east')
        ).to.eql([
          {
            instance: 'eu-east',
            status: 'Inactive',
            start: '',
            duration: '',
          },
        ]);
      });

      it('allows the user to mute a specific instance', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        log.debug(`Ensuring us-central is not muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('us-central', false);

        log.debug(`Muting us-central`);
        await pageObjects.alertDetailsUI.clickAlertInstanceMuteButton('us-central');

        log.debug(`Ensuring us-central is muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('us-central', true);
      });

      it('allows the user to unmute a specific instance', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        log.debug(`Ensuring us-east is not muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('us-east', false);

        log.debug(`Muting us-east`);
        await pageObjects.alertDetailsUI.clickAlertInstanceMuteButton('us-east');

        log.debug(`Ensuring us-east is muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('us-east', true);

        log.debug(`Unmuting us-east`);
        await pageObjects.alertDetailsUI.clickAlertInstanceMuteButton('us-east');

        log.debug(`Ensuring us-east is not muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('us-east', false);
      });

      it('allows the user unmute an inactive instance', async () => {
        log.debug(`Ensuring eu-east is muted`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceMute('eu-east', true);

        log.debug(`Unmuting eu-east`);
        await pageObjects.alertDetailsUI.clickAlertInstanceMuteButton('eu-east');

        log.debug(`Ensuring eu-east is removed from list`);
        await pageObjects.alertDetailsUI.ensureAlertInstanceExistance('eu-east', false);
      });
    });

    describe('Alert Instance Pagination', function () {
      const testRunUuid = uuid.v4();
      let alert: any;

      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const actions = await Promise.all([
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${0}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
          alerting.actions.createAction({
            name: `slack-${testRunUuid}-${1}`,
            actionTypeId: '.slack',
            config: {},
            secrets: {
              webhookUrl: 'https://test',
            },
          }),
        ]);

        const instances = flatten(
          range(10).map((index) => [
            { id: `us-central-${index}` },
            { id: `us-east-${index}` },
            { id: `us-west-${index}` },
          ])
        );
        alert = await alerting.alerts.createAlwaysFiringWithActions(
          `test-alert-${testRunUuid}`,
          actions.map((action) => ({
            id: action.id,
            group: 'default',
            params: {
              message: 'from alert 1s',
              level: 'warn',
            },
          })),
          {
            instances,
          }
        );

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { alertInstances } = await alerting.alerts.getAlertState(alert.id);
          expect(Object.keys(alertInstances).length).to.eql(instances.length);
        });

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);
      });

      const PAGE_SIZE = 10;
      it('renders the first page', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const { alertInstances } = await alerting.alerts.getAlertState(alert.id);

        const items = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(items.length).to.eql(PAGE_SIZE);

        const [firstItem] = items;
        expect(firstItem.instance).to.eql(Object.keys(alertInstances)[0]);
      });

      it('navigates to the next page', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const { alertInstances } = await alerting.alerts.getAlertState(alert.id);

        await pageObjects.alertDetailsUI.clickPaginationNextPage();

        await retry.try(async () => {
          const [firstItem] = await pageObjects.alertDetailsUI.getAlertInstancesList();
          expect(firstItem.instance).to.eql(Object.keys(alertInstances)[PAGE_SIZE]);
        });
      });
    });
  });
};
