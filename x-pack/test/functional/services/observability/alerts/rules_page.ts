/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityAlertsRulesProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getManageRulesPageHref = async () => {
    const manageRulesPage = await testSubjects.find('manageRulesPages');
    return manageRulesPage.getAttribute('href');
  };

  const goToMangeRulesPage = async () => {
    const manageRulesButton = await testSubjects.find('manageRulesPages');
    return manageRulesButton.click();
  };

  const getCreateRuleButton = async () => {
    return await testSubjects.exists('createRulButton');
  };

  return { getManageRulesPageHref, goToMangeRulesPage, getCreateRuleButton };
}
