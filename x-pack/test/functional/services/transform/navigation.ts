/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformNavigationProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateTo() {
      return await pageObjects.common.navigateToApp('transform');
    },

    async navigateToRules() {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
      await testSubjects.existOrFail('rulesList');
    },
  };
}
