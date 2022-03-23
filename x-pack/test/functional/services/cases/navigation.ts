/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesNavigationProvider({ getPageObject, getService }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');

  return {
    async navigateToApp() {
      await common.navigateToApp('cases');
      await testSubjects.existOrFail('cases-app', { timeout: 2000 });
    },

    async navigateToConfigurationPage() {
      await this.navigateToApp();
      common.clickAndValidate('configure-case-button', 'case-configure-title');
    },
  };
}
