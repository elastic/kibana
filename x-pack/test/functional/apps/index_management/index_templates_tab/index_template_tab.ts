/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  const INDEX_TEMPLATE_NAME = `test-index-template-name`;

  describe('Index template tab', function () {
    before(async () => {
      await log.debug('Navigating to the index templates tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
      // Click create template button
      await testSubjects.click('createTemplateButton');
    });

    afterEach(async () => {
      await es.indices.deleteIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
      });
      await testSubjects.click('reloadButton');
    });

    it('can create an index template with data retention', async () => {
      // Complete required fields from step 1
      await testSubjects.setValue('nameField', INDEX_TEMPLATE_NAME);
      await testSubjects.setValue('indexPatternsField', 'test-1');
      // Enable data retention
      await testSubjects.click('dataRetentionToggle > input');
      // Set the retention to 7 hours
      await testSubjects.setValue('valueDataRetentionField', '7');
      await testSubjects.click('show-filters-button');
      await testSubjects.click('filter-option-h');
      // Navigate to the last step of the wizard
      await testSubjects.click('formWizardStep-5');
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await testSubjects.getVisibleText('lifecycleValue')).to.be('7 hours');

      // Click Create template
      await pageObjects.indexManagement.clickNextButton();
      // Close detail tab
      await testSubjects.click('closeDetailsButton');
    });

    it('can create an index template with logsdb index mode', async () => {
      await testSubjects.click('createTemplateButton');
      // Fill out required fields
      await testSubjects.setValue('nameField', INDEX_TEMPLATE_NAME);
      await testSubjects.setValue('indexPatternsField', 'logsdb-test-index-pattern');

      await testSubjects.click('indexModeField');
      await testSubjects.click('index_mode_logsdb');

      // Navigate to the last step of the wizard
      await testSubjects.click('formWizardStep-5');
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await testSubjects.exists('indexModeTitle')).to.be(true);
      expect(await testSubjects.getVisibleText('indexModeValue')).to.be('LogsDB');

      // Click Create template
      await pageObjects.indexManagement.clickNextButton();
      // Close detail tab
      await testSubjects.click('closeDetailsButton');
    });
  });
};
