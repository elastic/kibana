/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { generateUniqueKey } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const comboBox = getService('comboBox');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const rules = getService('rules');
  const toasts = getService('toasts');

  async function getAlertsByName(name: string) {
    const {
      body: { data: alerts },
    } = await supertest
      .get(`/api/alerting/rules/_find?search=${name}&search_fields=name`)
      .expect(200);

    return alerts;
  }

  async function deleteAlerts(alertIds: string[]) {
    await asyncForEach(alertIds, async (alertId: string) => {
      await supertest
        .delete(`/api/alerting/rule/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });
  }

  async function deleteConnectorByName(connectorName: string) {
    const { body: connectors } = await supertest.get(`/api/actions/connectors`).expect(200);
    const connector = connectors?.find((c: { name: string }) => c.name === connectorName);
    if (!connector) {
      return;
    }
    await supertest
      .delete(`/api/actions/connector/${connector.id}`)
      .set('kbn-xsrf', 'foo')
      .expect(204, '');
  }

  async function defineEsQueryAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.click(`.es-query-SelectOption`);
    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click('queryFormType_esQuery');
    await testSubjects.click('selectIndexExpression');
    await comboBox.set('thresholdIndexesComboBox', 'k');
    await testSubjects.click('thresholdAlertTimeFieldSelect');
    await retry.try(async () => {
      const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
      expect(fieldOptions[1]).not.to.be(undefined);
      await fieldOptions[1].click();
    });
    await testSubjects.click('closePopover');
    // need this two out of popup clicks to close them
    const nameInput = await testSubjects.find('ruleNameInput');
    await nameInput.click();
  }

  async function defineAlwaysFiringAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.click('test.always-firing-SelectOption');
    await testSubjects.setValue('ruleNameInput', alertName);
  }

  async function discardNewRuleCreation() {
    await rules.common.cancelRuleCreation();
  }

  describe('create alert', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
    });

    it('should delete the right action when the same action has been added twice', async () => {
      // create a new rule
      const ruleName = generateUniqueKey();
      await rules.common.defineIndexThresholdAlert(ruleName);

      // create webhook connector
      await testSubjects.click('.webhook-alerting-ActionTypeSelectOption');
      await testSubjects.click('createActionConnectorButton-0');
      await testSubjects.setValue('nameInput', 'webhook-test');
      await testSubjects.setValue('webhookUrlText', 'https://test.test');
      await testSubjects.setValue('webhookUserInput', 'fakeuser');
      await testSubjects.setValue('webhookPasswordInput', 'fakepassword');

      // save rule
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      await find.setValueByClass('kibanaCodeEditor', 'myUniqueKey');
      await testSubjects.click('saveRuleButton');

      // add new action and remove first one
      await testSubjects.click('ruleSidebarEditAction');
      await testSubjects.click('.webhook-alerting-ActionTypeSelectOption');
      await find.clickByCssSelector(
        '[data-test-subj="alertActionAccordion-0"] [aria-label="Delete"]'
      );

      // check that the removed action is the right one
      const doesExist = await find.existsByXpath(".//*[text()='myUniqueKey']");
      expect(doesExist).to.eql(false);

      // clean up created alert
      const alertsToDelete = await getAlertsByName(ruleName);
      await deleteAlerts(alertsToDelete.map((rule: { id: string }) => rule.id));
      expect(true).to.eql(true);
      // Additional cleanup step to prevent
      // FLAKY: https://github.com/elastic/kibana/issues/167443
      // FLAKY: https://github.com/elastic/kibana/issues/167444
      await deleteConnectorByName('webhook-test');
    });

    it('should create an alert', async () => {
      const alertName = generateUniqueKey();
      await rules.common.defineIndexThresholdAlert(alertName);

      // filterKuery validation
      await testSubjects.setValue('filterKuery', 'group:');
      const filterKueryInput = await testSubjects.find('filterKuery');
      expect(await filterKueryInput.elementHasClass('euiFieldSearch-isInvalid')).to.eql(true);
      await testSubjects.setValue('filterKuery', 'group: group-0');
      expect(await filterKueryInput.elementHasClass('euiFieldSearch-isInvalid')).to.eql(false);

      await testSubjects.click('.slack-alerting-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test.com');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await toasts.getTitleAndDismiss();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      await testSubjects.click('notifyWhenSelect');
      await testSubjects.click('onThrottleInterval');
      await testSubjects.setValue('throttleInput', '10');

      // Alerts search bar (conditional actions)
      await testSubjects.click('alertsFilterQueryToggle');

      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('addFilter');
      await testSubjects.click('filterFieldSuggestionList');
      await comboBox.set('filterFieldSuggestionList', '_id');
      await comboBox.set('filterOperatorList', 'is not');
      await testSubjects.setValue('filterParams', 'fake-rule-id');
      await testSubjects.click('saveFilter');
      await testSubjects.setValue('queryInput', '_id: *');

      const messageTextArea = await find.byCssSelector('[data-test-subj="messageTextArea"]');
      expect(await messageTextArea.getAttribute('value')).to.eql(
        `Rule '{{rule.name}}' is active for group '{{context.group}}':

- Value: {{context.value}}
- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}
- Timestamp: {{context.date}}`
      );
      await testSubjects.setValue('messageTextArea', 'test message ');
      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-alert.actionGroup');
      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alert.actionGroup}}'
      );
      await messageTextArea.type(' some additional text ');

      await testSubjects.click('messageAddVariableButton');
      await testSubjects.setValue('messageVariablesSelectableSearch', 'rule.id');
      await testSubjects.click('variableMenuButton-rule.id');

      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alert.actionGroup}} some additional text {{rule.id}}'
      );

      await testSubjects.click('saveRuleButton');
      const toastTitle = await toasts.getTitleAndDismiss();
      expect(toastTitle).to.eql(`Created rule "${alertName}"`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      const searchResultAfterSave = searchResultsAfterSave[0];
      expect(omit(searchResultAfterSave, 'duration')).to.eql({
        name: `${alertName}Index threshold`,
        tags: '',
        interval: '1 min',
      });
      expect(searchResultAfterSave.duration).to.match(/\d{2,}:\d{2}/);

      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should create an alert with actions in multiple groups', async () => {
      const alertName = generateUniqueKey();
      await defineAlwaysFiringAlert(alertName);

      // create Slack connector and attach an action using it
      await testSubjects.click('.slack-alerting-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test.com');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await toasts.getTitleAndDismiss();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-0"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addAlertActionButton');
      await testSubjects.click('.slack-alerting-ActionTypeSelectOption');
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-1"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addNewActionConnectorActionGroup-1');
      await testSubjects.click('addNewActionConnectorActionGroup-1-option-other');

      await testSubjects.click('saveRuleButton');
      const toastTitle = await toasts.getTitleAndDismiss();
      expect(toastTitle).to.eql(`Created rule "${alertName}"`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      const searchResultAfterSave = searchResultsAfterSave[0];
      expect(omit(searchResultAfterSave, 'duration')).to.eql({
        name: `${alertName}Always Firing`,
        tags: '',
        interval: '1 min',
      });

      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should show save confirmation before creating alert with no actions', async () => {
      const alertName = generateUniqueKey();
      await defineAlwaysFiringAlert(alertName);

      await testSubjects.click('saveRuleButton');
      await testSubjects.existOrFail('confirmRuleSaveModal');
      await testSubjects.click('confirmRuleSaveModal > confirmModalCancelButton');
      await testSubjects.missingOrFail('confirmRuleSaveModal');
      await find.existsByCssSelector('[data-test-subj="saveRuleButton"]:not(disabled)');

      await testSubjects.click('saveRuleButton');
      await testSubjects.existOrFail('confirmRuleSaveModal');
      await testSubjects.click('confirmRuleSaveModal > confirmModalConfirmButton');
      await testSubjects.missingOrFail('confirmRuleSaveModal');

      const toastTitle = await toasts.getTitleAndDismiss();
      expect(toastTitle).to.eql(`Created rule "${alertName}"`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      const searchResultAfterSave = searchResultsAfterSave[0];
      expect(omit(searchResultAfterSave, 'duration')).to.eql({
        name: `${alertName}Always Firing`,
        tags: '',
        interval: '1 min',
      });

      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should show discard confirmation before closing flyout without saving', async () => {
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await testSubjects.click(`.es-query-SelectOption`);
      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.missingOrFail('confirmRuleCloseModal');

      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await testSubjects.click(`.es-query-SelectOption`);
      await testSubjects.setValue('ruleNameInput', 'alertName');
      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.existOrFail('confirmRuleCloseModal');
      await testSubjects.click('confirmRuleCloseModal > confirmModalCancelButton');
      await testSubjects.missingOrFail('confirmRuleCloseModal');

      await discardNewRuleCreation();
    });

    it('should show error when es_query is invalid', async () => {
      const alertName = generateUniqueKey();
      await defineEsQueryAlert(alertName);

      await testSubjects.setValue('queryJsonEditor', '', {
        clearWithKeyboard: true,
      });
      const queryJsonEditor = await testSubjects.find('queryJsonEditor');
      await queryJsonEditor.clearValue();
      // Invalid query
      await testSubjects.setValue('queryJsonEditor', '{"query":{"foo":""}}', {
        clearWithKeyboard: true,
      });
      await testSubjects.click('testQuery');
      await testSubjects.missingOrFail('testQuerySuccess');
      await testSubjects.existOrFail('testQueryError');
      await testSubjects.setValue('queryJsonEditor', '');
      await discardNewRuleCreation();
    });

    it('should successfully test valid es_query alert', async () => {
      const alertName = generateUniqueKey();
      await defineEsQueryAlert(alertName);

      await testSubjects.setValue('queryJsonEditor', '', {
        clearWithKeyboard: true,
      });
      const queryJsonEditor = await testSubjects.find('queryJsonEditor');
      await queryJsonEditor.clearValue();
      // Valid query
      await testSubjects.setValue('queryJsonEditor', '{"query":{"match_all":{}}}', {
        clearWithKeyboard: true,
      });
      await testSubjects.click('testQuery');
      await testSubjects.existOrFail('testQuerySuccess');
      await testSubjects.missingOrFail('testQueryError');

      await discardNewRuleCreation();
    });
  });
};
