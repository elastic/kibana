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
import { ObjectRemover } from '../../lib/object_remover';
import { alwaysFiringAlertType } from '../../fixtures/plugins/alerts/server/plugin';
import { getTestAlertData, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'alertDetailsUI']);
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  async function createActionManualCleanup(overwrites: Record<string, any> = {}) {
    const { body: createdAction } = await supertest
      .post(`/api/actions/action`)
      .set('kbn-xsrf', 'foo')
      .send(getTestActionData(overwrites))
      .expect(200);
    return createdAction;
  }

  async function createAction(overwrites: Record<string, any> = {}) {
    const createdAction = await createActionManualCleanup(overwrites);
    objectRemover.add(createdAction.id, 'action', 'actions');
    return createdAction;
  }

  async function createAlert(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send(getTestAlertData(overwrites))
      .expect(200);
    objectRemover.add(createdAlert.id, 'alert', 'alerts');
    return createdAlert;
  }

  async function createAlwaysFiringAlert(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send(
        getTestAlertData({
          alertTypeId: 'test.always-firing',
          ...overwrites,
        })
      )
      .expect(200);
    objectRemover.add(createdAlert.id, 'alert', 'alerts');
    return createdAlert;
  }

  async function createActions(testRunUuid: string) {
    return await Promise.all([
      createAction({ name: `slack-${testRunUuid}-${0}` }),
      createAction({ name: `slack-${testRunUuid}-${1}` }),
    ]);
  }

  async function createAlertWithActionsAndParams(
    testRunUuid: string,
    params: Record<string, any> = {}
  ) {
    const actions = await createActions(testRunUuid);
    return await createAlwaysFiringAlert({
      name: `test-alert-${testRunUuid}`,
      actions: actions.map((action) => ({
        id: action.id,
        group: 'default',
        params: {
          message: 'from alert 1s',
          level: 'warn',
        },
      })),
      params,
    });
  }

  async function getAlertInstanceSummary(alertId: string) {
    const { body: summary } = await supertest
      .get(`/api/alerts/alert/${alertId}/_instance_summary`)
      .expect(200);
    return summary;
  }

  async function muteAlertInstance(alertId: string, alertInstanceId: string) {
    const { body: response } = await supertest
      .post(`/api/alerts/alert/${alertId}/alert_instance/${alertInstanceId}/_mute`)
      .set('kbn-xsrf', 'foo')
      .expect(204);

    return response;
  }

  describe('Alert Details', function () {
    describe('Header', function () {
      const testRunUuid = uuid.v4();
      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');
        const alert = await createAlertWithActionsAndParams(testRunUuid);

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);
      });

      after(async () => {
        await objectRemover.removeAll();
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
      const alertName = uuid.v4();
      const updatedAlertName = `Changed Alert Name ${alertName}`;

      before(async () => {
        await createAlwaysFiringAlert({
          name: alertName,
          alertTypeId: '.index-threshold',
          params: {
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            groupBy: 'all',
            threshold: [1000, 5000],
            index: ['.kibana_1'],
            timeField: 'alert',
          },
          actions: [
            {
              group: 'threshold met',
              id: 'my-server-log',
              params: { level: 'info', message: ' {{context.message}}' },
            },
          ],
        });
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('should open edit alert flyout', async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alertName);

        const editButton = await testSubjects.find('openEditAlertFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

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

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(updatedAlertName);

        const editButton = await testSubjects.find('openEditAlertFlyoutButton');
        await editButton.click();

        await testSubjects.setValue('alertNameInput', uuid.v4(), {
          clearWithKeyboard: true,
        });

        await testSubjects.click('cancelSaveEditedAlertButton');
        await testSubjects.existOrFail('confirmAlertCloseModal');
        await testSubjects.click('confirmAlertCloseModal > confirmModalConfirmButton');
        await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedAlertButton"]');

        await editButton.click();

        const nameInputAfterCancel = await testSubjects.find('alertNameInput');
        const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
        expect(textAfterCancel).to.eql(updatedAlertName);
      });
    });

    describe('Edit alert with deleted connector', function () {
      const testRunUuid = uuid.v4();

      after(async () => {
        await objectRemover.removeAll();
      });

      it('should show and update deleted connectors', async () => {
        const action = await createActionManualCleanup({
          name: `slack-${testRunUuid}-${0}`,
        });

        await pageObjects.common.navigateToApp('triggersActions');
        const alert = await createAlwaysFiringAlert({
          name: testRunUuid,
          actions: [
            {
              group: 'default',
              id: action.id,
              params: { level: 'info', message: ' {{context.message}}' },
            },
            {
              group: 'other',
              id: action.id,
              params: { level: 'info', message: ' {{context.message}}' },
            },
          ],
        });

        // refresh to see alert
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // verify content
        await testSubjects.existOrFail('alertsList');

        // delete connector
        await pageObjects.triggersActionsUI.changeTabs('connectorsTab');
        await pageObjects.triggersActionsUI.searchConnectors(action.name);
        await testSubjects.click('deleteConnector');
        await testSubjects.existOrFail('deleteIdsConfirmation');
        await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 connector');

        // click on first alert
        await pageObjects.triggersActionsUI.changeTabs('alertsTab');
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        const editButton = await testSubjects.find('openEditAlertFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(false);
        expect(await testSubjects.exists('alertActionAccordion-0')).to.eql(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).to.eql(false);
        expect(await testSubjects.exists('alertActionAccordion-1')).to.eql(true);

        await testSubjects.click('createActionConnectorButton-0');
        await testSubjects.existOrFail('connectorAddModal');
        await testSubjects.setValue('nameInput', 'new connector');
        await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
        await testSubjects.click('connectorAddModal > saveActionButtonModal');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).to.eql(true);
      });
    });

    describe('View In App', function () {
      const alertName = uuid.v4();

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('triggersActions');
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the alert details view in app button', async () => {
        const alert = await createAlert({
          name: alertName,
          consumer: 'alerting_fixture',
        });

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
        const alert = await createAlwaysFiringAlert({
          name: `test-alert-disabled-nav`,
        });

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

        const instances = [{ id: 'us-central' }, { id: 'us-east' }, { id: 'us-west' }];
        alert = await createAlertWithActionsAndParams(testRunUuid, {
          instances,
        });

        // refresh to see alert
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { instances: alertInstances } = await getAlertInstanceSummary(alert.id);
          expect(Object.keys(alertInstances).length).to.eql(instances.length);
        });
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the active alert instances', async () => {
        // refresh to ensure Api call and UI are looking at freshest output
        await browser.refresh();

        // Get action groups
        const { actionGroups } = alwaysFiringAlertType;

        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const actionGroupNameFromId = (actionGroupId: string) =>
          actionGroups.find(
            (actionGroup: { id: string; name: string }) => actionGroup.id === actionGroupId
          )?.name;

        const summary = await getAlertInstanceSummary(alert.id);
        const dateOnAllInstancesFromApiResponse: Record<string, string> = mapValues(
          summary.instances,
          (instance) => instance.activeStartDate
        );

        const actionGroupNameOnAllInstancesFromApiResponse = mapValues(
          summary.instances,
          (instance) => {
            const name = actionGroupNameFromId(instance.actionGroupId);
            return name ? ` (${name})` : '';
          }
        );

        log.debug(
          `API RESULT: ${Object.entries(dateOnAllInstancesFromApiResponse)
            .map(([id, date]) => `${id}: ${moment(date).utc()}`)
            .join(', ')}`
        );

        const instancesList: any[] = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(instancesList.map((instance) => omit(instance, 'duration'))).to.eql([
          {
            instance: 'us-central',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-central']}`,
            start: moment(dateOnAllInstancesFromApiResponse['us-central'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            instance: 'us-east',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-east']}`,
            start: moment(dateOnAllInstancesFromApiResponse['us-east'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            instance: 'us-west',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-west']}`,
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
        await muteAlertInstance(alert.id, 'eu-east');

        // refresh to see alert
        await browser.refresh();

        const instancesList: any[] = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(
          instancesList.filter((alertInstance) => alertInstance.instance === 'eu-east')
        ).to.eql([
          {
            instance: 'eu-east',
            status: 'OK',
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

        const instances = flatten(
          range(10).map((index) => [
            { id: `us-central-${index}` },
            { id: `us-east-${index}` },
            { id: `us-west-${index}` },
          ])
        );
        alert = await createAlertWithActionsAndParams(testRunUuid, {
          instances,
        });

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { instances: alertInstances } = await getAlertInstanceSummary(alert.id);
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

      after(async () => {
        await objectRemover.removeAll();
      });

      const PAGE_SIZE = 10;
      it('renders the first page', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const { instances: alertInstances } = await getAlertInstanceSummary(alert.id);

        const items = await pageObjects.alertDetailsUI.getAlertInstancesList();
        expect(items.length).to.eql(PAGE_SIZE);

        const [firstItem] = items;
        expect(firstItem.instance).to.eql(Object.keys(alertInstances)[0]);
      });

      it('navigates to the next page', async () => {
        // Verify content
        await testSubjects.existOrFail('alertInstancesList');

        const { instances: alertInstances } = await getAlertInstanceSummary(alert.id);

        await pageObjects.alertDetailsUI.clickPaginationNextPage();

        await retry.try(async () => {
          const [firstItem] = await pageObjects.alertDetailsUI.getAlertInstancesList();
          expect(firstItem.instance).to.eql(Object.keys(alertInstances)[PAGE_SIZE]);
        });
      });
    });
  });
};
