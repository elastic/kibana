/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createEsQueryRule as createRule,
  createSlackConnector,
  createIndexConnector,
} from '../../../../api_integration/test_suites/common/alerting/helpers/alerting_api_helper';

export enum RuleNotifyWhen {
  CHANGE = 'onActionGroupChange',
  ACTIVE = 'onActiveAlert',
  THROTTLE = 'onThrottleInterval',
}

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlTriggersActionsUI = getPageObject('svlTriggersActionsUI');
  const svlRuleDetailsUI = getPageObject('svlRuleDetailsUI');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const comboBox = getService('comboBox');
  const config = getService('config');

  const openFirstRule = async (ruleName: string) => {
    await svlTriggersActionsUI.searchRules(ruleName);
    await find.clickDisplayedByCssSelector(`[data-test-subj="rulesList"] [title="${ruleName}"]`);
  };

  const openRulesSection = async () => {
    await svlSearchNavigation.navigateToLandingPage();
    await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
  };

  const navigateToConnectors = async () => {
    await svlSearchNavigation.navigateToLandingPage();
    await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
    await testSubjects.click('app-card-triggersActionsConnectors');
  };

  const deleteConnector = async (connectorName: string) => {
    await svlTriggersActionsUI.searchConnectors(connectorName);
    await testSubjects.click('deleteConnector');
    await testSubjects.existOrFail('deleteIdsConfirmation');
    await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
    await testSubjects.missingOrFail('deleteIdsConfirmation');
  };

  // Failing: See https://github.com/elastic/kibana/issues/172916
  // Failing: See https://github.com/elastic/kibana/issues/172918
  describe.skip('Rule details', () => {
    let ruleIdList: string[];
    let connectorIdList: string[];

    const svlCommonApi = getService('svlCommonApi');
    const svlUserManager = getService('svlUserManager');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('Header', () => {
      const testRunUuid = uuidv4();
      const ruleName = `test-rule-${testRunUuid}`;
      const RULE_TYPE_ID = '.es-query';

      before(async () => {
        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: ruleName,
          ruleTypeId: RULE_TYPE_ID,
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [],
        });

        ruleIdList = [rule.id];

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await openFirstRule(rule.name);
      });

      after(async () => {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      });

      it('renders the rule details', async () => {
        const headingText = await testSubjects.getVisibleText('ruleDetailsTitle');
        expect(headingText.includes(`test-rule-${testRunUuid}`)).toBe(true);
        const ruleType = await testSubjects.getVisibleText('ruleTypeLabel');
        expect(ruleType).toEqual('Elasticsearch query');
        const owner = await testSubjects.getVisibleText('apiKeyOwnerLabel');
        expect(owner).toEqual(config.get('servers.kibana.username'));
      });

      it('should disable the rule', async () => {
        const actionsDropdown = await testSubjects.find('statusDropdown');

        expect(await actionsDropdown.getVisibleText()).toEqual('Enabled');

        await actionsDropdown.click();
        const actionsMenuElem = await testSubjects.find('ruleStatusMenu');
        const actionsMenuItemElem = await actionsMenuElem.findAllByClassName('euiContextMenuItem');

        await actionsMenuItemElem.at(1)?.click();

        await retry.try(async () => {
          expect(await actionsDropdown.getVisibleText()).toEqual('Disabled');
        });
      });

      it('should allow you to snooze a disabled rule', async () => {
        const actionsDropdown = await testSubjects.find('statusDropdown');

        expect(await actionsDropdown.getVisibleText()).toEqual('Disabled');

        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const snoozeIndefinite = await testSubjects.find('ruleSnoozeIndefiniteApply');
        await snoozeIndefinite.click();

        await retry.try(async () => {
          await testSubjects.existOrFail('rulesListNotifyBadge-snoozedIndefinitely');
        });

        // Unsnooze the rule for the next test
        snoozeBadge = await testSubjects.find('rulesListNotifyBadge-snoozedIndefinitely');
        await snoozeBadge.click();

        const snoozeCancel = await testSubjects.find('ruleSnoozeCancel');
        await snoozeCancel.click();
      });

      it('should reenable a disabled the rule', async () => {
        const actionsDropdown = await testSubjects.find('statusDropdown');

        expect(await actionsDropdown.getVisibleText()).toEqual('Disabled');

        await actionsDropdown.click();
        const actionsMenuElem = await testSubjects.find('ruleStatusMenu');
        const actionsMenuItemElem = await actionsMenuElem.findAllByClassName('euiContextMenuItem');

        await actionsMenuItemElem.at(0)?.click();

        await retry.try(async () => {
          expect(await actionsDropdown.getVisibleText()).toEqual('Enabled');
        });
      });

      it('should snooze the rule', async () => {
        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const snoozeIndefinite = await testSubjects.find('ruleSnoozeIndefiniteApply');
        await snoozeIndefinite.click();

        await retry.try(async () => {
          await testSubjects.existOrFail('rulesListNotifyBadge-snoozedIndefinitely');
        });

        // Unsnooze the rule for the next test
        snoozeBadge = await testSubjects.find('rulesListNotifyBadge-snoozedIndefinitely');
        await snoozeBadge.click();

        const snoozeCancel = await testSubjects.find('ruleSnoozeCancel');
        await snoozeCancel.click();
      });

      it('should snooze the rule for a set duration', async () => {
        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const snooze8h = await testSubjects.find('linkSnooze8h');
        await snooze8h.click();

        await retry.try(async () => {
          await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
        });

        // Unsnooze the rule for the next test
        snoozeBadge = await testSubjects.find('rulesListNotifyBadge-snoozed');
        await snoozeBadge.click();

        const snoozeCancel = await testSubjects.find('ruleSnoozeCancel');
        await snoozeCancel.click();
      });

      it('should add snooze schedule', async () => {
        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const addScheduleButton = await testSubjects.find('ruleAddSchedule');
        await addScheduleButton.click();

        const saveScheduleButton = await testSubjects.find('scheduler-saveSchedule');
        await saveScheduleButton.click();

        await retry.try(async () => {
          await testSubjects.existOrFail('rulesListNotifyBadge-scheduled');
        });

        // Unsnooze the rule for the next test
        snoozeBadge = await testSubjects.find('rulesListNotifyBadge-scheduled');
        await snoozeBadge.click();

        const snoozeCancel = await testSubjects.find('ruleRemoveAllSchedules');
        await snoozeCancel.click();

        const confirmButton = await testSubjects.find('confirmModalConfirmButton');
        await confirmButton.click();
      });
    });

    describe('Edit rule button', () => {
      const testRunUuid = uuidv4();
      const ruleName = `${testRunUuid}`;
      const updatedRuleName = `Changed Rule Name ${ruleName}`;
      const RULE_TYPE_ID = '.es-query';

      before(async () => {
        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: ruleName,
          ruleTypeId: RULE_TYPE_ID,
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [],
        });

        ruleIdList = [rule.id];

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await openFirstRule(rule.name);
      });

      after(async () => {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      });

      it('should open edit rule flyout', async () => {
        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).toBe(false);

        await testSubjects.setValue('ruleNameInput', updatedRuleName, {
          clearWithKeyboard: true,
        });

        await find.clickByCssSelector('[data-test-subj="saveEditedRuleButton"]:not(disabled)');

        await retry.try(async () => {
          const resultToast = await toasts.getElementByIndex(1);
          const toastText = await resultToast.getVisibleText();
          expect(toastText).toEqual(`Updated '${updatedRuleName}'`);
        });

        await retry.tryForTime(30 * 1000, async () => {
          const headingText = await testSubjects.getVisibleText('ruleDetailsTitle');
          expect(headingText.includes(updatedRuleName)).toBe(true);
        });
      });

      it('should reset rule when canceling an edit', async () => {
        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();

        await testSubjects.setValue('ruleNameInput', uuidv4(), {
          clearWithKeyboard: true,
        });

        await testSubjects.click('cancelSaveEditedRuleButton');
        await testSubjects.existOrFail('confirmRuleCloseModal');
        await testSubjects.click('confirmRuleCloseModal > confirmModalConfirmButton');
        await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedRuleButton"]');

        await editButton.click();

        const nameInputAfterCancel = await testSubjects.find('ruleNameInput');
        const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
        expect(textAfterCancel).toEqual(updatedRuleName);
      });
    });

    describe('Edit rule with deleted connector', () => {
      const ALERT_ACTION_INDEX = 'alert-action-es-query';
      const RULE_TYPE_ID = '.es-query';

      afterEach(async () => {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
        await Promise.all(
          connectorIdList.map(async (connectorId) => {
            await supertest
              .delete(`/api/actions/connector/${connectorId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      });

      it('should show and update deleted connectors when there are existing connectors of the same type', async () => {
        const testRunUuid = uuidv4();

        const connector1 = await createSlackConnector({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          name: `slack-${testRunUuid}-${0}`,
        });

        const connector2 = await createSlackConnector({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          name: `slack-${testRunUuid}-${1}`,
        });

        connectorIdList = [connector2.id];

        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: testRunUuid,
          ruleTypeId: RULE_TYPE_ID,
          schedule: { interval: '1m' },
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [
            {
              group: 'query matched',
              id: connector1.id,
              params: { level: 'info', message: ' {{context.message}}' },
              frequency: {
                summary: false,
                notify_when: RuleNotifyWhen.THROTTLE,
                throttle: '1m',
              },
            },
          ],
        });

        ruleIdList = [rule.id];

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await navigateToConnectors();

        await deleteConnector(connector1.name);

        await retry.try(async () => {
          const resultToast = await toasts.getElementByIndex(1);
          const toastText = await resultToast.getVisibleText();
          expect(toastText).toEqual('Deleted 1 connector');
        });

        await openRulesSection();
        await openFirstRule(rule.name);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).toEqual(false);

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).toEqual(false);
        expect(await testSubjects.exists('alertActionAccordion-0')).toEqual(true);

        expect(await testSubjects.exists('selectActionConnector-.slack-0')).toEqual(true);
        // click the super selector the reveal the options
        await testSubjects.click('selectActionConnector-.slack-0');
        await testSubjects.click(`dropdown-connector-${connector2.id}`);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).toEqual(true);
      });

      it('should show and update deleted connectors when there are no existing connectors of the same type', async () => {
        const testRunUuid = uuidv4();
        const connector = await createIndexConnector({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          name: `index-${testRunUuid}-${2}`,
          indexName: ALERT_ACTION_INDEX,
        });

        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: testRunUuid,
          ruleTypeId: RULE_TYPE_ID,
          schedule: { interval: '1m' },
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [
            {
              group: 'query matched',
              id: connector.id,
              params: { level: 'info', message: ' {{context.message}}' },
              frequency: {
                summary: false,
                notify_when: RuleNotifyWhen.THROTTLE,
                throttle: '1m',
              },
            },
            {
              group: 'recovered',
              id: connector.id,
              params: { level: 'info', message: ' {{context.message}}' },
              frequency: {
                summary: false,
                notify_when: RuleNotifyWhen.THROTTLE,
                throttle: '1m',
              },
            },
          ],
        });
        ruleIdList = [rule.id];

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await navigateToConnectors();
        await deleteConnector(connector.name);

        await retry.try(async () => {
          const resultToast = await toasts.getElementByIndex(1);
          const toastText = await resultToast.getVisibleText();
          expect(toastText).toEqual('Deleted 1 connector');
        });

        await openRulesSection();
        await openFirstRule(rule.name);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        expect(await testSubjects.exists('hasActionsDisabled')).toEqual(false);

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).toEqual(false);
        expect(await testSubjects.exists('alertActionAccordion-0')).toEqual(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).toEqual(false);
        expect(await testSubjects.exists('alertActionAccordion-1')).toEqual(true);

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
          ).toEqual(true);
        });
        await testSubjects.click('connectorAddModal > saveActionButtonModal');
        await testSubjects.missingOrFail('deleteIdsConfirmation');

        expect(await testSubjects.exists('addNewActionConnectorActionGroup-0')).toEqual(true);
        expect(await testSubjects.exists('addNewActionConnectorActionGroup-1')).toEqual(true);

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await navigateToConnectors();
        await deleteConnector('new connector');
      });
    });

    describe('Edit rule with legacy rule-level notify values', () => {
      afterEach(async () => {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
        await Promise.all(
          connectorIdList.map(async (connectorId) => {
            await supertest
              .delete(`/api/actions/connector/${connectorId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      });

      it('should convert rule-level params to action-level params and save the alert successfully', async () => {
        const testRunUuid = uuidv4();
        const RULE_TYPE_ID = '.es-query';

        const connector1 = await createSlackConnector({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          name: `slack-${testRunUuid}-${0}`,
        });

        const connector2 = await createSlackConnector({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          name: `slack-${testRunUuid}-${1}`,
        });

        connectorIdList = [connector1.id, connector2.id];

        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: `test-rule-${testRunUuid}`,
          ruleTypeId: RULE_TYPE_ID,
          schedule: { interval: '1m' },
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [connector1, connector2].map((connector) => ({
            id: connector.id,
            group: 'query matched',
            params: {
              message: 'from alert 1s',
              level: 'warn',
            },
            frequency: {
              summary: false,
              notify_when: RuleNotifyWhen.THROTTLE,
              throttle: '2d',
            },
          })),
        });
        ruleIdList = [rule.id];

        const updatedRuleName = `Changed rule ${rule.name}`;

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await openFirstRule(rule.name);

        const editButton = await testSubjects.find('openEditRuleFlyoutButton');
        await editButton.click();
        const notifyWhenSelect = await testSubjects.find('notifyWhenSelect');
        expect(await notifyWhenSelect.getVisibleText()).toEqual('On custom action intervals');
        const throttleInput = await testSubjects.find('throttleInput');
        const throttleUnitInput = await testSubjects.find('throttleUnitInput');
        expect(await throttleInput.getAttribute('value')).toEqual('2');
        expect(await throttleUnitInput.getAttribute('value')).toEqual('d');
        await testSubjects.setValue('ruleNameInput', updatedRuleName, {
          clearWithKeyboard: true,
        });

        await find.clickByCssSelector('[data-test-subj="saveEditedRuleButton"]:not(disabled)');

        await retry.try(async () => {
          const resultToast = await toasts.getElementByIndex(1);
          const toastText = await resultToast.getVisibleText();
          expect(toastText).toEqual(`Updated '${updatedRuleName}'`);
        });
      });
    });

    describe('View In App', () => {
      const ruleName = uuidv4();
      const RULE_TYPE_ID = '.es-query';

      afterEach(async () => {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      });

      it('renders a disabled rule details view in app button', async () => {
        const rule = await createRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'alerts',
          name: ruleName,
          ruleTypeId: RULE_TYPE_ID,
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          actions: [],
        });

        ruleIdList = [rule.id];

        await openRulesSection();
        await testSubjects.existOrFail('rulesList');
        await openFirstRule(rule.name);

        expect(await svlRuleDetailsUI.isViewInAppDisabled()).toEqual(true);
      });
    });
  });
};
