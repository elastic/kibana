/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityAlertsRulesProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  const getManageRulesPageHref = async () => {
    const manageRulesPage = await testSubjects.find('manageRulesPages');
    return manageRulesPage.getAttribute('href');
  };

  const clickCreateRuleButton = async () => {
    const createRuleButton = await testSubjects.find('createRuleButton');
    return createRuleButton.click();
  };

  const clickRuleStatusDropDownMenu = async () => testSubjects.click('statusContextButton');

  const clickDisableFromDropDownMenu = async () =>
    find.clickByCssSelector('div.euiContextMenuPanel > div > div > button:nth-child(2)');

  return {
    getManageRulesPageHref,
    clickCreateRuleButton,
    clickRuleStatusDropDownMenu,
    clickDisableFromDropDownMenu,
  };
}
