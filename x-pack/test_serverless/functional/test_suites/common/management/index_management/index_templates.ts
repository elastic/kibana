/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  const TEST_TEMPLATE = 'a_test_template';
  const INDEX_PATTERN = `index_pattern_${Math.random()}`;

  describe('Index Templates', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the index templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      log.debug('Cleaning up created template');

      try {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      } catch (e) {
        log.debug('[Setup error] Error creating test policy');
        throw e;
      }
    });

    it('renders the index templates tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/templates`);
    });

    describe('Index template list', () => {
      before(async () => {
        await es.indices.putIndexTemplate({
          name: TEST_TEMPLATE,
          body: {
            index_patterns: [INDEX_PATTERN],
          },
        });
      });

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      });

      it('Displays the test template in the list of templates', async () => {
        const templates = await testSubjects.findAll('row');

        const getTemplateName = async (template: WebElementWrapper) => {
          const templateNameElement = await template.findByTestSubject('templateDetailsLink');
          return await templateNameElement.getVisibleText();
        };

        const templatesList = await Promise.all(
          templates.map((template) => getTemplateName(template))
        );

        const newTemplateExists = Boolean(
          templatesList.find((templateName) => templateName === TEST_TEMPLATE)
        );

        expect(newTemplateExists).to.be(true);
      });
    });

    describe('Create index template', () => {
      const TEST_TEMPLATE_NAME = `test_template_${Date.now()}`;

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE_NAME }, { ignore: [404] });
      });

      it('Creates index template', async () => {
        await testSubjects.click('createTemplateButton');

        await testSubjects.setValue('nameField', TEST_TEMPLATE_NAME);
        await testSubjects.setValue('indexPatternsField', INDEX_PATTERN);

        // Click form summary step and then the submit button
        await testSubjects.click('formWizardStep-5');
        await testSubjects.click('nextButton');

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('title')).to.contain(TEST_TEMPLATE_NAME);
        });
      });
    });
  });
};
