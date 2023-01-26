/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../test/functional/ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('Rules Settings Link', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('triggersActionsUiExample/rules_settings_link');
    });

    it('should load from shareable lazy loader', async () => {
      const exists = await testSubjects.exists('rulesSettingsLink');
      expect(exists).to.be(true);
    });

    it('should be able to open the modal', async () => {
      await testSubjects.click('rulesSettingsLink');
      await testSubjects.waitForDeleted('centerJustifiedSpinner');
      await testSubjects.existOrFail('rulesSettingsModal');
    });
  });
};
