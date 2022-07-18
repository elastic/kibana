/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesSingleViewServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const header = getPageObject('header');

  return {
    async deleteCase() {
      await common.clickAndValidate('property-actions-ellipses', 'property-actions-trash');
      await common.clickAndValidate('property-actions-trash', 'confirmModalConfirmButton');
      await testSubjects.click('confirmModalConfirmButton');
      await header.waitUntilLoadingHasFinished();
    },
  };
}
