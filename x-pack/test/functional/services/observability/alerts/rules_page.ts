/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

const METRIC_THRESHOLD_RULE_TYPE_SELECTOR = 'metrics.alert.threshold-SelectOption';
const CUSTOM_THRESHOLD_RULE_TYPE_SELECTOR = 'observability.rules.custom_threshold-SelectOption';

export function ObservabilityAlertsRulesProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  const getManageRulesPageHref = async () => {
    const manageRulesPageButton = await testSubjects.find('manageRulesPageButton');
    return manageRulesPageButton.getAttribute('href');
  };

  const clickCreateRuleButton = async () => {
    await testSubjects.existOrFail('createRuleButton');
    const createRuleButton = await testSubjects.find('createRuleButton');
    return createRuleButton.click();
  };

  const clickRuleStatusDropDownMenu = async () => testSubjects.click('statusDropdown');

  const clickDisableFromDropDownMenu = async () => testSubjects.click('statusDropdownDisabledItem');

  const clickLogsTab = async () => testSubjects.click('ruleLogsTab');

  const clickOnRuleInEventLogs = async () => {
    await find.clickByButtonText('metric-threshold');
  };

  const clickOnInfrastructureCategory = async () => {
    const categories = await testSubjects.find('ruleTypeModal');
    const category = await categories.findByCssSelector(`.euiFacetButton[title="Infrastructure"]`);
    await category.click();
  };

  const clickOnMetricThresholdRule = async () => {
    await testSubjects.existOrFail(METRIC_THRESHOLD_RULE_TYPE_SELECTOR);
    await testSubjects.click(METRIC_THRESHOLD_RULE_TYPE_SELECTOR);
  };

  const clickOnObservabilityCategory = async () => {
    const categories = await testSubjects.find('ruleTypeModal');
    const category = await categories.findByCssSelector(`.euiFacetButton[title="Observability"]`);
    await category.click();
  };

  const clickOnCustomThresholdRule = async () => {
    await testSubjects.existOrFail(CUSTOM_THRESHOLD_RULE_TYPE_SELECTOR);
    await testSubjects.click(CUSTOM_THRESHOLD_RULE_TYPE_SELECTOR);
  };

  return {
    getManageRulesPageHref,
    clickCreateRuleButton,
    clickRuleStatusDropDownMenu,
    clickDisableFromDropDownMenu,
    clickLogsTab,
    clickOnRuleInEventLogs,
    clickOnInfrastructureCategory,
    clickOnMetricThresholdRule,
    clickOnObservabilityCategory,
    clickOnCustomThresholdRule,
  };
}
