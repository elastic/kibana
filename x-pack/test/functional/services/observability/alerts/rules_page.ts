/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Key } from 'selenium-webdriver';
import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityAlertsRulesProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  const getManageRulesPageHref = async () => {
    const manageRulesPageButton = await testSubjects.find('manageRulesPageButton');
    return manageRulesPageButton.getAttribute('href');
  };

  const clickCreateRuleButton = async () => {
    const createRuleButton = await testSubjects.find('createRuleButton');
    return createRuleButton.click();
  };

  const clickRuleStatusDropDownMenu = async () => testSubjects.click('statusDropdown');

  const clickDisableFromDropDownMenu = async () => testSubjects.click('statusDropdownDisabledItem');

  const clickLogsTab = async () => testSubjects.click('ruleLogsTab');

  const clickOnRuleInEventLogs = async () => {
    await find.clickByButtonText('metric-threshold');
  };

  const clickOnObservabilityCategory = async () => {
    const categories = await testSubjects.find('ruleTypeModal');
    const category = await categories.findByCssSelector(`.euiFacetButton[title="Observability"]`);
    await category.click();
  };

  const clickOnCustomThresholdRule = async () => {
    await testSubjects.click('observability.rules.custom_threshold-SelectOption');
  };

  const fillCustomThresholdRule = async (name: string) => {
    await testSubjects.setValue('ruleNameInput', name);
    await testSubjects.setValue('comboBoxSearchInput', 'tag1');

    // select data view
    await testSubjects.click('selectDataViewExpression');
    await testSubjects.setValue('indexPattern-switcher--input', 'metricbeat-*');
    const dataViewExpression = await find.byCssSelector(
      '[data-test-subj="indexPattern-switcher--input"]'
    );
    await dataViewExpression.pressKeys(Key.ENTER);

    // select aggregation
    await testSubjects.click('aggregationNameA');
    await testSubjects.click('aggregationTypeSelect');
    // assert all options are available
    await find.byCssSelector('option[value="avg"]');
    await find.byCssSelector('option[value="min"]');
    await find.byCssSelector('option[value="max"]');
    await find.byCssSelector('option[value="sum"]');
    await find.byCssSelector('option[value="count"]');
    await find.byCssSelector('option[value="cardinality"]');
    await find.byCssSelector('option[value="p99"]');
    await find.byCssSelector('option[value="p95"]');
    await find.byCssSelector('option[value="rate"]');

    // set first aggregation
    await find.clickByCssSelector(`option[value="avg"]`);
    const input1 = await find.byCssSelector('[data-test-subj="aggregationField"] input');
    await input1.type('metricset.rtt');
    await testSubjects.click('o11yClosablePopoverTitleButton');

    // set second aggregation
    await testSubjects.click('thresholdRuleCustomEquationEditorAddAggregationFieldButton');
    await testSubjects.click('aggregationNameB');
    await testSubjects.setValue('ruleKqlFilterSearchField', 'service.name : "opbeans-node"');
    await testSubjects.click('o11yClosablePopoverTitleButton');

    // set custom equation
    // await testSubjects.click('customEquation');
    // const customEquationField = await find.byCssSelector(
    //   '[data-test-subj="thresholdRuleCustomEquationEditorFieldText"]'
    // );
    // await customEquationField.click();
    // await customEquationField.type('A - B');
    // await testSubjects.click('o11yClosablePopoverTitleButton');

    // set threshold
    await testSubjects.click('thresholdPopover');
    await testSubjects.click('comparatorOptionsComboBox');
    // assert all options are available
    await find.byCssSelector('option[value=">="]');
    await find.byCssSelector('option[value="<="]');
    await find.byCssSelector('option[value=">"]');
    await find.byCssSelector('option[value="<"]');
    await find.byCssSelector('option[value="between"]');
    await find.byCssSelector('option[value="notBetween"]');
    // select an option
    await find.clickByCssSelector(`option[value="notBetween"]`);
    const thresholdField1 = await find.byCssSelector('[data-test-subj="alertThresholdInput0"]');
    await thresholdField1.click();
    await new Promise((r) => setTimeout(r, 1000));
    await thresholdField1.pressKeys(Key.BACK_SPACE);
    await new Promise((r) => setTimeout(r, 1000));
    await thresholdField1.pressKeys(Key.BACK_SPACE);
    await new Promise((r) => setTimeout(r, 1000));
    await thresholdField1.pressKeys(Key.BACK_SPACE);
    await thresholdField1.type('200');
    const thresholdField2 = await find.byCssSelector('[data-test-subj="alertThresholdInput1"]');
    thresholdField2.type('250');
    await find.clickByCssSelector('[aria-label="Close"]');

    // set equation label
    await testSubjects.setValue('thresholdRuleCustomEquationEditorFieldText', 'test equation');

    // set time range
    await testSubjects.click('forLastExpression');
    await new Promise((r) => setTimeout(r, 1000));
    const timeRangeField = await find.byCssSelector('[data-test-subj="timeWindowSizeNumber"]');
    await timeRangeField.click();
    await new Promise((r) => setTimeout(r, 1000));
    await timeRangeField.pressKeys(Key.BACK_SPACE);
    await timeRangeField.type('2');
    // assert all options are available
    await testSubjects.click('timeWindowUnitSelect');
    await find.byCssSelector('option[value="s"]');
    await find.byCssSelector('option[value="m"]');
    await find.byCssSelector('option[value="h"]');
    await find.byCssSelector('option[value="d"]');
    // select an option
    await new Promise((r) => setTimeout(r, 3000));
    await find.clickByCssSelector('[data-test-subj="timeWindowUnitSelect"] option[value="d"]');
    await find.clickByCssSelector('[aria-label="Close"]');
    const groupByField = await find.byCssSelector(
      '[data-test-subj="thresholdRuleMetricsExplorer-groupBy"] [data-test-subj="comboBoxSearchInput"]'
    );
    await groupByField.type('docker.container.name');
    await testSubjects.click('saveRuleButton');
    await testSubjects.click('confirmModalConfirmButton');
    await find.byCssSelector('button[title="test custom threshold rule"]');
  };

  return {
    getManageRulesPageHref,
    clickCreateRuleButton,
    clickRuleStatusDropDownMenu,
    clickDisableFromDropDownMenu,
    clickLogsTab,
    clickOnRuleInEventLogs,
    clickOnObservabilityCategory,
    clickOnCustomThresholdRule,
    fillCustomThresholdRule,
  };
}
