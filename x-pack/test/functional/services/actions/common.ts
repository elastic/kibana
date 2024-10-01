/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export type ActionsCommon = ProvidedType<typeof ActionsCommonServiceProvider>;

export function ActionsCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async openNewConnectorForm(name: string) {
      const createBtn = await testSubjects.find('createConnectorButton');
      const createBtnIsVisible = await createBtn.isDisplayed();
      if (createBtnIsVisible) {
        await createBtn.click();
      } else {
        await testSubjects.click('createFirstActionButton');
      }

      await testSubjects.click(`.${name}-card`);
    },

    async cancelConnectorForm() {
      const flyOutCancelButton = await testSubjects.find('edit-connector-flyout-close-btn');
      const isEnabled = await flyOutCancelButton.isEnabled();
      const isDisplayed = await flyOutCancelButton.isDisplayed();

      if (isEnabled && isDisplayed) {
        await flyOutCancelButton.click();
        await testSubjects.missingOrFail('edit-connector-flyout-close-btn');
      }
    },
  };
}
