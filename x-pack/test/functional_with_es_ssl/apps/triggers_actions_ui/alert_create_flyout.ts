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
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const browser = getService('browser');

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

  async function defineEsQueryAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click(`.es-query-SelectOption`);
    await testSubjects.click('selectIndexExpression');
    const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
    await indexComboBox.click();
    await indexComboBox.type('k');
    const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
    await filterSelectItem.click();
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

  async function defineIndexThresholdAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click(`.index-threshold-SelectOption`);
    await testSubjects.click('selectIndexExpression');
    const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
    await indexComboBox.click();
    await indexComboBox.type('k');
    const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
    await filterSelectItem.click();
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

    await testSubjects.click('whenExpression');
    await testSubjects.click('whenExpressionSelect');
    await retry.try(async () => {
      const aggTypeOptions = await find.allByCssSelector('#aggTypeField option');
      expect(aggTypeOptions[1]).not.to.be(undefined);
      await aggTypeOptions[1].click();
    });

    await testSubjects.click('ofExpressionPopover');
    const ofComboBox = await find.byCssSelector('#ofField');
    await ofComboBox.click();
    const ofOptionsString = await comboBox.getOptionsList('availablefieldsOptionsComboBox');
    const ofOptions = ofOptionsString.trim().split('\n');
    expect(ofOptions.length > 0).to.be(true);
    await comboBox.set('availablefieldsOptionsComboBox', ofOptions[0]);
  }

  async function defineAlwaysFiringAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click('test.always-firing-SelectOption');
  }

  // FLAKY: https://github.com/elastic/kibana/issues/126873
  describe.skip('create alert', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
    });

    afterEach(async () => {
      // Reset the Rules tab without reloading the entire page
      // This is safer than trying to close the alert flyout, which may or may not be open at the end of a test
      await testSubjects.click('connectorsTab');
      await testSubjects.click('rulesTab');
    });

    it('should create an alert', async () => {
      const alertName = generateUniqueKey();
      await defineIndexThresholdAlert(alertName);

      await testSubjects.click('notifyWhenSelect');
      await testSubjects.click('onThrottleInterval');
      await testSubjects.setValue('throttleInput', '10');

      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      const messageTextArea = await find.byCssSelector('[data-test-subj="messageTextArea"]');
      expect(await messageTextArea.getAttribute('value')).to.eql(
        `alert '{{alertName}}' is active for group '{{context.group}}':

- Value: {{context.value}}
- Conditions Met: {{context.conditions}} over {{params.timeWindowSize}}{{params.timeWindowUnit}}
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
      await testSubjects.click('variableMenuButton-rule.id');

      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alert.actionGroup}} some additional text {{rule.id}}'
      );

      await testSubjects.click('saveRuleButton');
      const toastTitle = await pageObjects.common.closeToast();
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
      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-0"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addAlertActionButton');
      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-1"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addNewActionConnectorActionGroup-1');
      await testSubjects.click('addNewActionConnectorActionGroup-1-option-other');

      await testSubjects.click('saveRuleButton');
      const toastTitle = await pageObjects.common.closeToast();
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

      const toastTitle = await pageObjects.common.closeToast();
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
      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.missingOrFail('confirmRuleCloseModal');

      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await testSubjects.setValue('intervalInput', '10');
      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.existOrFail('confirmRuleCloseModal');
      await testSubjects.click('confirmRuleCloseModal > confirmModalCancelButton');
      await testSubjects.missingOrFail('confirmRuleCloseModal');
    });

    it('should successfully test valid es_query alert', async () => {
      const alertName = generateUniqueKey();
      await defineEsQueryAlert(alertName);

      // Valid query
      await testSubjects.setValue('queryJsonEditor', '{"query":{"match_all":{}}}', {
        clearWithKeyboard: true,
      });
      await testSubjects.click('testQuery');
      await testSubjects.existOrFail('testQuerySuccess');
      await testSubjects.missingOrFail('testQueryError');

      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.existOrFail('confirmRuleCloseModal');
      await testSubjects.click('confirmRuleCloseModal > confirmModalConfirmButton');
    });

    it('should show error when es_query is invalid', async () => {
      const alertName = generateUniqueKey();
      await defineEsQueryAlert(alertName);

      // Invalid query
      await testSubjects.setValue('queryJsonEditor', '{"query":{"foo":{}}}', {
        clearWithKeyboard: true,
      });
      await testSubjects.click('testQuery');
      await testSubjects.missingOrFail('testQuerySuccess');
      await testSubjects.existOrFail('testQueryError');
    });

    it('should show all rule types on click euiFormControlLayoutClearButton', async () => {
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await testSubjects.setValue('ruleNameInput', 'alertName');
      const ruleTypeSearchBox = await find.byCssSelector('[data-test-subj="ruleSearchField"]');
      await ruleTypeSearchBox.type('notexisting rule type');
      await ruleTypeSearchBox.pressKeys(browser.keys.ENTER);

      const ruleTypes = await find.allByCssSelector('.triggersActionsUI__ruleTypeNodeHeading');
      expect(ruleTypes).to.have.length(0);

      const searchClearButton = await find.byCssSelector('.euiFormControlLayoutClearButton');
      await searchClearButton.click();

      const ruleTypesClearFilter = await find.allByCssSelector(
        '.triggersActionsUI__ruleTypeNodeHeading'
      );
      expect(ruleTypesClearFilter.length).to.above(0);
    });
  });
};
