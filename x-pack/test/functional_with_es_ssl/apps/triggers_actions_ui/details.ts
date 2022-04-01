/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { omit, mapValues, range, flatten } from 'lodash';
import moment from 'moment';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { alwaysFiringAlertType } from '../../fixtures/plugins/alerts/server/plugin';
import { getTestAlertData, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'ruleDetailsUI']);
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const supertest = getService('supertest');
  const comboBox = getService('comboBox');
  const objectRemover = new ObjectRemover(supertest);

  async function createConnectorManualCleanup(overwrites: Record<string, any> = {}) {
    const { body: createdConnector } = await supertest
      .post(`/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send(getTestActionData(overwrites))
      .expect(200);
    return createdConnector;
  }

  async function createConnector(overwrites: Record<string, any> = {}) {
    const createdConnector = await createConnectorManualCleanup(overwrites);
    objectRemover.add(createdConnector.id, 'action', 'actions');
    return createdConnector;
  }

  async function createRule(overwrites: Record<string, any> = {}) {
    const { body: createdRule } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestAlertData(overwrites))
      .expect(200);
    objectRemover.add(createdRule.id, 'alert', 'alerts');
    return createdRule;
  }

  async function createAlwaysFiringRule(overwrites: Record<string, any> = {}) {
    const { body: createdRule } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(
        getTestAlertData({
          rule_type_id: 'test.always-firing',
          ...overwrites,
        })
      )
      .expect(200);
    objectRemover.add(createdRule.id, 'alert', 'alerts');
    return createdRule;
  }

  async function createConnectors(testRunUuid: string) {
    return await Promise.all([
      createConnector({ name: `slack-${testRunUuid}-${0}` }),
      createConnector({ name: `slack-${testRunUuid}-${1}` }),
    ]);
  }

  async function createRuleWithActionsAndParams(
    testRunUuid: string,
    params: Record<string, any> = {},
    overwrites: Record<string, any> = {}
  ) {
    const connectors = await createConnectors(testRunUuid);
    return await createAlwaysFiringRule({
      name: `test-rule-${testRunUuid}`,
      actions: connectors.map((connector) => ({
        id: connector.id,
        group: 'default',
        params: {
          message: 'from alert 1s',
          level: 'warn',
        },
      })),
      params,
      ...overwrites,
    });
  }

  async function createRuleWithSmallInterval(
    testRunUuid: string,
    params: Record<string, any> = {}
  ) {
    const connectors = await createConnectors(testRunUuid);
    return await createAlwaysFiringRule({
      name: `test-rule-${testRunUuid}`,
      schedule: {
        interval: '1s',
      },
      actions: connectors.map((connector) => ({
        id: connector.id,
        group: 'default',
        params: {
          message: 'from alert 1s',
          level: 'warn',
        },
      })),
      params,
    });
  }

  async function getAlertSummary(ruleId: string) {
    const { body: summary } = await supertest
      .get(`/internal/alerting/rule/${encodeURIComponent(ruleId)}/_alert_summary`)
      .expect(200);
    return summary;
  }

  async function muteAlert(ruleId: string, alertId: string) {
    const { body: response } = await supertest
      .post(
        `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
          alertId
        )}/_mute`
      )
      .set('kbn-xsrf', 'foo')
      .expect(204);

    return response;
  }

  describe('Rule Details', function () {
    describe('Header', function () {
      const testRunUuid = uuid.v4();
      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');
        const rule = await createRuleWithSmallInterval(testRunUuid);

        // refresh to see rule
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the rule details', async () => {
        const headingText = await pageObjects.ruleDetailsUI.getHeadingText();
        expect(headingText.includes(`test-rule-${testRunUuid}`)).to.be(true);

        const ruleType = await pageObjects.ruleDetailsUI.getRuleType();
        expect(ruleType).to.be(`Always Firing`);

        const { connectorType } = await pageObjects.ruleDetailsUI.getActionsLabels();
        expect(connectorType).to.be(`Slack`);
      });

      it('renders toast when schedule is less than configured minimum', async () => {
        await testSubjects.existOrFail('intervalConfigToast');

        const editButton = await testSubjects.find('ruleIntervalToastEditButton');
        await editButton.click();

        await testSubjects.click('cancelSaveEditedRuleButton');
      });

      it('should disable the rule', async () => {
        const enableSwitch = await testSubjects.find('enableSwitch');

        const isChecked = await enableSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('true');

        await enableSwitch.click();

        const disableSwitchAfterDisabling = await testSubjects.find('enableSwitch');
        const isCheckedAfterDisabling = await disableSwitchAfterDisabling.getAttribute(
          'aria-checked'
        );
        expect(isCheckedAfterDisabling).to.eql('false');
      });

      it('shouldnt allow you to mute a disabled rule', async () => {
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

      it('should reenable a disabled the rule', async () => {
        const enableSwitch = await testSubjects.find('enableSwitch');

        const isChecked = await enableSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('false');

        await enableSwitch.click();

        const disableSwitchAfterReenabling = await testSubjects.find('enableSwitch');
        const isCheckedAfterDisabling = await disableSwitchAfterReenabling.getAttribute(
          'aria-checked'
        );
        expect(isCheckedAfterDisabling).to.eql('true');
      });

      it('should mute the rule', async () => {
        const muteSwitch = await testSubjects.find('muteSwitch');

        const isChecked = await muteSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('false');

        await muteSwitch.click();

        const muteSwitchAfterDisabling = await testSubjects.find('muteSwitch');
        const isCheckedAfterDisabling = await muteSwitchAfterDisabling.getAttribute('aria-checked');
        expect(isCheckedAfterDisabling).to.eql('true');
      });

      it('should unmute the rule', async () => {
        const muteSwitch = await testSubjects.find('muteSwitch');

        const isChecked = await muteSwitch.getAttribute('aria-checked');
        expect(isChecked).to.eql('true');

        await muteSwitch.click();

        const muteSwitchAfterUnmuting = await testSubjects.find('muteSwitch');
        const isCheckedAfterDisabling = await muteSwitchAfterUnmuting.getAttribute('aria-checked');
        expect(isCheckedAfterDisabling).to.eql('false');
      });
    });

    describe('Edit rule button', function () {
      const ruleName = uuid.v4();
      const updatedRuleName = `Changed Rule Name ${ruleName}`;

      before(async () => {
        await createAlwaysFiringRule({
          name: ruleName,
          rule_type_id: '.index-threshold',
          params: {
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            groupBy: 'all',
            threshold: [1000, 5000],
            index: '.kibana_1',
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

      it('should open edit rule flyout', async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        // refresh to see rule
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(ruleName);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

        await testSubjects.setValue('ruleNameInput', updatedRuleName, {
          clearWithKeyboard: true,
        });

        await find.clickByCssSelector('[data-test-subj="saveEditedRuleButton"]:not(disabled)');

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql(`Updated '${updatedRuleName}'`);

        await retry.tryForTime(30 * 1000, async () => {
          const headingText = await pageObjects.ruleDetailsUI.getHeadingText();
          expect(headingText.includes(updatedRuleName)).to.be(true);
        });
      });

      it('should reset rule when canceling an edit', async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        // refresh to see rule
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(updatedRuleName);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();

        await testSubjects.setValue('ruleNameInput', uuid.v4(), {
          clearWithKeyboard: true,
        });

        await testSubjects.click('cancelSaveEditedRuleButton');
        await testSubjects.existOrFail('confirmRuleCloseModal');
        await testSubjects.click('confirmRuleCloseModal > confirmModalConfirmButton');
        await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedRuleButton"]');

        await editButton.click();

        const nameInputAfterCancel = await testSubjects.find('ruleNameInput');
        const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
        expect(textAfterCancel).to.eql(updatedRuleName);
      });
    });

    describe('Edit rule with deleted connector', function () {
      const testRunUuid = uuid.v4();

      afterEach(async () => {
        await objectRemover.removeAll();
      });

      it('should show and update deleted connectors when there are existing connectors of the same type', async () => {
        const connector = await createConnectorManualCleanup({
          name: `slack-${testRunUuid}-${0}`,
        });

        await pageObjects.common.navigateToApp('triggersActions');
        const rule = await createAlwaysFiringRule({
          name: testRunUuid,
          actions: [
            {
              group: 'default',
              id: connector.id,
              params: { level: 'info', message: ' {{context.message}}' },
            },
          ],
        });

        // refresh to see rule
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // verify content
        await testSubjects.existOrFail('rulesList');

        // delete connector
        await pageObjects.triggersActionsUI.changeTabs('connectorsTab');
        await pageObjects.triggersActionsUI.searchConnectors(connector.name);
        await testSubjects.click('deleteConnector');
        await testSubjects.existOrFail('deleteIdsConfirmation');
        await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 connector');

        // click on first alert
        await pageObjects.triggersActionsUI.changeTabs('rulesTab');
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(false);
        expect(await testSubjects.exists('alertActionAccordion-0')).to.eql(true);

        expect(await testSubjects.exists('selectActionConnector-.slack-0')).to.eql(true);
        // click the super selector the reveal the options
        await testSubjects.click('selectActionConnector-.slack-0');
        // click the available option (my-slack1 is a preconfigured connector created before this test runs)
        await testSubjects.click('dropdown-connector-my-slack1');
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(true);
      });

      it('should show and update deleted connectors when there are no existing connectors of the same type', async () => {
        const connector = await createConnectorManualCleanup({
          name: `index-${testRunUuid}-${0}`,
          connector_type_id: '.index',
          config: {
            index: `index-${testRunUuid}-${0}`,
          },
          secrets: {},
        });

        await pageObjects.common.navigateToApp('triggersActions');
        const alert = await createAlwaysFiringRule({
          name: testRunUuid,
          actions: [
            {
              group: 'default',
              id: connector.id,
              params: { level: 'info', message: ' {{context.message}}' },
            },
            {
              group: 'other',
              id: connector.id,
              params: { level: 'info', message: ' {{context.message}}' },
            },
          ],
        });

        // refresh to see alert
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // verify content
        await testSubjects.existOrFail('rulesList');

        // delete connector
        await pageObjects.triggersActionsUI.changeTabs('connectorsTab');
        await pageObjects.triggersActionsUI.searchConnectors(connector.name);
        await testSubjects.click('deleteConnector');
        await testSubjects.existOrFail('deleteIdsConfirmation');
        await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 connector');

        // click on first rule
        await pageObjects.triggersActionsUI.changeTabs('rulesTab');
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(alert.name);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).to.eql(false);

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(false);
        expect(await testSubjects.exists('alertActionAccordion-0')).to.eql(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).to.eql(false);
        expect(await testSubjects.exists('alertActionAccordion-1')).to.eql(true);

        await testSubjects.click('createActionConnectorButton-0');
        await testSubjects.existOrFail('connectorAddModal');
        await testSubjects.setValue('nameInput', 'new connector');
        await retry.try(async () => {
          // At times we find the driver controlling the ComboBox in tests
          // can select the wrong item, this ensures we always select the correct index
          await comboBox.set('connectorIndexesComboBox', 'test-index');
          expect(
            await comboBox.isOptionSelected(
              await testSubjects.find('connectorIndexesComboBox'),
              'test-index'
            )
          ).to.be(true);
        });
        await testSubjects.click('connectorAddModal > saveActionButtonModal');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).to.eql(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).to.eql(true);
      });
    });

    describe('View In App', function () {
      const ruleName = uuid.v4();

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('triggersActions');
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the rule details view in app button', async () => {
        const rule = await createRule({
          name: ruleName,
          consumer: 'alerting_fixture',
        });

        // refresh to see rule
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);

        expect(await pageObjects.ruleDetailsUI.isViewInAppEnabled()).to.be(true);

        await pageObjects.ruleDetailsUI.clickViewInApp();

        expect(await pageObjects.ruleDetailsUI.getNoOpAppTitle()).to.be(`View Rule ${rule.id}`);
      });

      it('renders a disabled rule details view in app button', async () => {
        const rule = await createAlwaysFiringRule({
          name: `test-rule-disabled-nav`,
        });

        // refresh to see rule
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);

        expect(await pageObjects.ruleDetailsUI.isViewInAppDisabled()).to.be(true);
      });
    });

    describe('Alerts', function () {
      const testRunUuid = uuid.v4();
      let rule: any;

      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const alerts = [{ id: 'us-central' }, { id: 'us-east' }, { id: 'us-west' }];
        rule = await createRuleWithActionsAndParams(testRunUuid, {
          instances: alerts,
        });

        // refresh to see rule
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { alerts: alertInstances } = await getAlertSummary(rule.id);
          expect(Object.keys(alertInstances).length).to.eql(alerts.length);
        });
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the active alerts', async () => {
        // refresh to ensure Api call and UI are looking at freshest output
        await browser.refresh();

        // Get action groups
        const { actionGroups } = alwaysFiringAlertType;

        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        const actionGroupNameFromId = (actionGroupId: string) =>
          actionGroups.find(
            (actionGroup: { id: string; name: string }) => actionGroup.id === actionGroupId
          )?.name;

        const summary = await getAlertSummary(rule.id);
        const dateOnAllAlertsFromApiResponse: Record<string, string> = mapValues(
          summary.alerts,
          (a) => a.activeStartDate
        );

        const actionGroupNameOnAllInstancesFromApiResponse = mapValues(summary.alerts, (a) => {
          const name = actionGroupNameFromId(a.actionGroupId);
          return name ? ` (${name})` : '';
        });

        log.debug(
          `API RESULT: ${Object.entries(dateOnAllAlertsFromApiResponse)
            .map(([id, date]) => `${id}: ${moment(date).utc()}`)
            .join(', ')}`
        );

        const alertsList: any[] = await pageObjects.ruleDetailsUI.getAlertsList();
        expect(alertsList.map((a) => omit(a, 'duration'))).to.eql([
          {
            alert: 'us-central',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-central']}`,
            start: moment(dateOnAllAlertsFromApiResponse['us-central'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            alert: 'us-east',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-east']}`,
            start: moment(dateOnAllAlertsFromApiResponse['us-east'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
          {
            alert: 'us-west',
            status: `Active${actionGroupNameOnAllInstancesFromApiResponse['us-west']}`,
            start: moment(dateOnAllAlertsFromApiResponse['us-west'])
              .utc()
              .format('D MMM YYYY @ HH:mm:ss'),
          },
        ]);

        const durationEpoch = moment(await pageObjects.ruleDetailsUI.getAlertDurationEpoch()).utc();

        log.debug(`DURATION EPOCH is: ${durationEpoch}]`);

        const durationFromInstanceInApiUntilPageLoad = mapValues(
          dateOnAllAlertsFromApiResponse,
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

        alertsList
          .map((a) => ({
            id: a.alert,
            // time from Alert Instance used to render the list until pageload (AKA durationEpoch)
            duration: moment.duration(a.duration),
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

      it('renders the muted inactive alerts', async () => {
        // mute an alert that doesn't exist
        await muteAlert(rule.id, 'eu/east');

        // refresh to see rule
        await browser.refresh();

        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        const alertsList: any[] = await pageObjects.ruleDetailsUI.getAlertsList();
        expect(alertsList.filter((a) => a.alert === 'eu/east')).to.eql([
          {
            alert: 'eu/east',
            status: 'Recovered',
            start: '',
            duration: '',
          },
        ]);
      });

      it('allows the user to mute a specific alert', async () => {
        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        log.debug(`Ensuring us-central is not muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('us-central', false);

        log.debug(`Muting us-central`);
        await pageObjects.ruleDetailsUI.clickAlertMuteButton('us-central');

        log.debug(`Ensuring us-central is muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('us-central', true);
      });

      it('allows the user to unmute a specific alert', async () => {
        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        log.debug(`Ensuring us-east is not muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('us-east', false);

        log.debug(`Muting us-east`);
        await pageObjects.ruleDetailsUI.clickAlertMuteButton('us-east');

        log.debug(`Ensuring us-east is muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('us-east', true);

        log.debug(`Unmuting us-east`);
        await pageObjects.ruleDetailsUI.clickAlertMuteButton('us-east');

        log.debug(`Ensuring us-east is not muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('us-east', false);
      });

      it('allows the user unmute an inactive alert', async () => {
        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        log.debug(`Ensuring eu/east is muted`);
        await pageObjects.ruleDetailsUI.ensureAlertMuteState('eu/east', true);

        log.debug(`Unmuting eu/east`);
        await pageObjects.ruleDetailsUI.clickAlertMuteButton('eu/east');

        log.debug(`Ensuring eu/east is removed from list`);
        await pageObjects.ruleDetailsUI.ensureAlertExistence('eu/east', false);
      });
    });

    describe('Alert Pagination', function () {
      const testRunUuid = uuid.v4();
      let rule: any;

      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const alerts = flatten(
          range(10).map((index) => [
            { id: `us-central-${index}` },
            { id: `us-east-${index}` },
            { id: `us-west-${index}` },
          ])
        );
        rule = await createRuleWithActionsAndParams(testRunUuid, {
          instances: alerts,
        });

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { alerts: alertInstances } = await getAlertSummary(rule.id);
          expect(Object.keys(alertInstances).length).to.eql(alerts.length);
        });

        // refresh to see rule
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      const PAGE_SIZE = 10;
      it('renders the first page', async () => {
        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        const { alerts: alertInstances } = await getAlertSummary(rule.id);

        const items = await pageObjects.ruleDetailsUI.getAlertsList();
        expect(items.length).to.eql(PAGE_SIZE);

        const [firstItem] = items;
        expect(firstItem.alert).to.eql(Object.keys(alertInstances)[0]);
      });

      it('navigates to the next page', async () => {
        // If the tab exists, click on the alert list
        await pageObjects.triggersActionsUI.maybeClickOnAlertTab();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        const { alerts: alertInstances } = await getAlertSummary(rule.id);

        await pageObjects.ruleDetailsUI.clickPaginationNextPage();

        await retry.try(async () => {
          const [firstItem] = await pageObjects.ruleDetailsUI.getAlertsList();
          expect(firstItem.alert).to.eql(Object.keys(alertInstances)[PAGE_SIZE]);
        });
      });
    });

    describe('Execution log', () => {
      const testRunUuid = uuid.v4();
      let rule: any;

      before(async () => {
        await pageObjects.common.navigateToApp('triggersActions');

        const alerts = [{ id: 'us-central' }];
        rule = await createRuleWithActionsAndParams(
          testRunUuid,
          {
            instances: alerts,
          },
          {
            schedule: { interval: '1s' },
            throttle: null,
          }
        );

        // refresh to see rule
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // click on first rule
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(rule.name);

        // await first run to complete so we have an initial state
        await retry.try(async () => {
          const { alerts: alertInstances } = await getAlertSummary(rule.id);
          expect(Object.keys(alertInstances).length).to.eql(alerts.length);
        });
      });

      after(async () => {
        await objectRemover.removeAll();
      });

      it('renders the event log list and can filter/sort', async () => {
        await browser.refresh();

        // Check to see if the experimental is enabled, if not, just return
        const tabbedContentExists = await testSubjects.exists('ruleDetailsTabbedContent');
        if (!tabbedContentExists) {
          return;
        }

        // Ensure we have some log data to work with
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const refreshButton = await testSubjects.find('superDatePickerApplyTimeButton');
        await refreshButton.click();

        // List, date picker, and status picker all exists
        await testSubjects.existOrFail('ruleEventLogList');
        await testSubjects.existOrFail('ruleEventLogListDatePicker');
        await testSubjects.existOrFail('ruleEventLogStatusFilterButton');

        let statusFilter = await testSubjects.find('ruleEventLogStatusFilterButton');
        let statusNumber = await statusFilter.findByCssSelector('.euiNotificationBadge');

        expect(statusNumber.getVisibleText()).to.eql(0);

        await statusFilter.click();
        await testSubjects.click('ruleEventLogStatusFilter-success');
        await statusFilter.click();

        statusFilter = await testSubjects.find('ruleEventLogStatusFilterButton');
        statusNumber = await statusFilter.findByCssSelector('.euiNotificationBadge');

        expect(statusNumber.getVisibleText()).to.eql(1);

        const eventLogList = await find.byCssSelector('.euiDataGridRow');
        const rows = await eventLogList.parseDomContent();
        expect(rows.length).to.be.greaterThan(0);

        await pageObjects.triggersActionsUI.ensureEventLogColumnExists('timestamp');
        await pageObjects.triggersActionsUI.ensureEventLogColumnExists('total_search_duration');

        const timestampCells = await find.allByCssSelector(
          '[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]'
        );

        // The test can be flaky and sometimes we'll get results without dates,
        // This is a reasonable compromise as we still validate the good rows
        let validTimestamps = 0;
        await asyncForEach(timestampCells, async (cell) => {
          const text = await cell.getVisibleText();
          if (text.toLowerCase() !== 'invalid date') {
            if (moment(text).isValid()) {
              validTimestamps += 1;
            }
          }
        });
        expect(validTimestamps).to.be.greaterThan(0);

        // Ensure duration cells are properly formatted
        const durationCells = await find.allByCssSelector(
          '[data-gridcell-column-id="total_search_duration"][data-test-subj="dataGridRowCell"]'
        );

        await asyncForEach(durationCells, async (cell) => {
          const text = await cell.getVisibleText();
          if (text) {
            expect(text).to.match(/^N\/A|\d{2,}:\d{2}$/);
          }
        });

        await pageObjects.triggersActionsUI.sortEventLogColumn('timestamp', 'asc');
        await pageObjects.triggersActionsUI.sortEventLogColumn('total_search_duration', 'asc');

        await testSubjects.existOrFail('dataGridHeaderCellSortingIcon-timestamp');
        await testSubjects.existOrFail('dataGridHeaderCellSortingIcon-total_search_duration');
      });
    });
  });
};
