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

  const clickCreateRuleButton = async () => {
    const createRuleButton = await testSubjects.find('createRuleButton');
    return createRuleButton.click();
  };

  return { getManageRulesPageHref, clickCreateRuleButton };
}
