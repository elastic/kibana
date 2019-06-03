/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function CanvasPageProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async expectCreateWorkpadButtonEnabled() {
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateWorkpadButtonDisabled() {
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async expectAddElementButton() {
      await testSubjects.existOrFail('add-element-button');
    },

    async expectNoAddElementButton() {
      // Ensure page is fully loaded first by waiting for the refresh button
      const refreshPopoverExists = await find.existsByCssSelector('#auto-refresh-popover', 20000);
      expect(refreshPopoverExists).to.be(true);

      const addElementButtonExists = await find.existsByCssSelector(
        'button[data-test-subj=add-element-button]',
        10 // don't need much of a wait at all here, because we already waited for refresh button above
      );
      expect(addElementButtonExists).to.be(false);
    },
  };
}
