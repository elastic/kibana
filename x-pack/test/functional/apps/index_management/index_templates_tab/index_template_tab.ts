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
    });

    afterEach(async () => {
      await es.indices.deleteIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
      });
      await testSubjects.click('reloadButton');
    });

    it('can create an index template with data retention', async () => {
      // Click create template button
      await testSubjects.click('createTemplateButton');
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

    it('can modify ignore_above, ignore_malformed, ignore_dynamic_beyond_limit, subobjects and timestamp format in an index template with logsdb index mode', async () => {
      await testSubjects.click('createTemplateButton');
      // Fill out required fields
      await testSubjects.setValue('nameField', INDEX_TEMPLATE_NAME);
      await testSubjects.setValue('indexPatternsField', 'logsdb-test-index-pattern');

      await testSubjects.click('indexModeField');
      await testSubjects.click('index_mode_logsdb');

      // Navigate to Index Settings
      await testSubjects.click('formWizardStep-2');
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Modify Index settings
      await testSubjects.setValue(
        'kibanaCodeEditor',
        JSON.stringify({
          index: {
            mapping: {
              ignore_above: '20',
              total_fields: {
                ignore_dynamic_beyond_limit: 'true',
              },
              ignore_malformed: 'true',
            },
          },
        }),
        {
          clearWithKeyboard: true,
        }
      );

      // Navigate to Mappings
      await testSubjects.click('formWizardStep-3');
      await pageObjects.header.waitUntilLoadingHasFinished();
      const mappingTabs = await testSubjects.findAll('formTab');
      await mappingTabs[3].click();

      // Modify timestamp format
      await testSubjects.click('comboBoxClearButton');
      await testSubjects.setValue('comboBoxInput', 'basic_date');
      await testSubjects.pressEnter('comboBoxInput');

      // Modify subobjects
      await testSubjects.click('subobjectsToggle');

      // Navigate to the last step of the wizard
      await testSubjects.click('formWizardStep-5');
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Click Create template
      await pageObjects.indexManagement.clickNextButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const flyoutTabs = await testSubjects.findAll('tab');

      // Verify Index Settings
      await flyoutTabs[1].click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('settingsTabContent')).to.be(true);
      const settingsTabContent = await testSubjects.getVisibleText('settingsTabContent');
      expect(JSON.parse(settingsTabContent)).to.eql({
        index: {
          mode: 'logsdb',
          mapping: {
            ignore_above: '20',
            total_fields: {
              ignore_dynamic_beyond_limit: 'true',
            },
            ignore_malformed: 'true',
          },
        },
      });

      // Verify Mappings
      await flyoutTabs[2].click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('mappingsTabContent')).to.be(true);
      const mappingsTabContent = await testSubjects.getVisibleText('mappingsTabContent');
      expect(JSON.parse(mappingsTabContent)).to.eql({
        dynamic_date_formats: ['basic_date'],
        _source: {
          mode: 'synthetic',
        },
        subobjects: false,
      });

      // Close detail tab
      await testSubjects.click('closeDetailsButton');
    });
  });
};
