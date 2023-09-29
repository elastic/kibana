/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
// import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createEsQueryRule as createRule } from '../../../../api_integration/test_suites/common/alerting/helpers/alerting_api_helper';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlTriggersActionsUI = getPageObject('svlTriggersActionsUI');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const toasts = getService('toasts');

  async function refreshRulesList() {
    await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
  }

  describe('Rule details', () => {
    let ruleIdList: string[];

    describe('Header', function () {
      const testRunUuid = uuidv4();
      const ruleName = `test-rule-${testRunUuid}`;
      const RULE_TYPE_ID = '.es-query';

      before(async () => {
        await svlCommonPage.login();
        await svlObltNavigation.navigateToLandingPage();
        await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });

        const rule = await createRule({
          supertest,
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

        await refreshRulesList();

        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await svlTriggersActionsUI.searchRules(rule.name);
        await find.clickDisplayedByCssSelector(
          `[data-test-subj="rulesList"] [title="${rule.name}"]`
        );
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
        await svlCommonPage.forceLogout();
      });

      it('renders the rule details', async () => {
        const headingText = await testSubjects.getVisibleText('ruleDetailsTitle');
        expect(headingText.includes(`test-rule-${testRunUuid}`)).toBe(true);
        const ruleType = await testSubjects.getVisibleText('ruleTypeLabel');
        expect(ruleType).toEqual('Elasticsearch query');
        const owner = await testSubjects.getVisibleText('apiKeyOwnerLabel');
        expect(owner).toEqual('elastic_serverless');
      });

      // it('renders toast when schedule is less than configured minimum', async () => {
      //   await testSubjects.existOrFail('intervalConfigToast');

      //   const editButton = await testSubjects.find('ruleIntervalToastEditButton');
      //   await editButton.click();

      //   await testSubjects.click('cancelSaveEditedRuleButton');
      // });

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
        // await pageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should snooze the rule for a set duration', async () => {
        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const snooze8h = await testSubjects.find('linkSnooze8h');
        await snooze8h.click();

        // await pageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
        });

        // Unsnooze the rule for the next test
        snoozeBadge = await testSubjects.find('rulesListNotifyBadge-snoozed');
        await snoozeBadge.click();

        const snoozeCancel = await testSubjects.find('ruleSnoozeCancel');
        await snoozeCancel.click();
        // await pageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should add snooze schedule', async () => {
        let snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
        await snoozeBadge.click();

        const addScheduleButton = await testSubjects.find('ruleAddSchedule');
        await addScheduleButton.click();

        const saveScheduleButton = await testSubjects.find('scheduler-saveSchedule');
        await saveScheduleButton.click();

        // await pageObjects.header.waitUntilLoadingHasFinished();

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
        // await pageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('Edit rule button', function () {
      const testRunUuid = uuidv4();
      const ruleName = `${testRunUuid}`;
      const updatedRuleName = `Changed Rule Name ${ruleName}`;
      const RULE_TYPE_ID = '.es-query';

      before(async () => {
        await svlCommonPage.login();
        await svlObltNavigation.navigateToLandingPage();
        await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });

        const rule = await createRule({
          supertest,
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

        await refreshRulesList();

        await testSubjects.existOrFail('rulesList');

        // click on first rule
        await svlTriggersActionsUI.searchRules(rule.name);
        await find.clickDisplayedByCssSelector(
          `[data-test-subj="rulesList"] [title="${rule.name}"]`
        );
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
        await svlCommonPage.forceLogout();
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
          const resultToast = await toasts.getToastElement(1);
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
  });
};
