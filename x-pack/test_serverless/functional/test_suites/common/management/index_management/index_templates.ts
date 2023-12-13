/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';
import type { WebElementWrapper } from '../../../../../../../test/functional/services/lib/web_element_wrapper';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const retry = getService('retry');

  const TEST_TEMPLATE = 'a_test_template';

  describe('Index Templates', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the index templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
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
            index_patterns: ['test*'],
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
      const TEST_TEMPLATE_NAME = `test_template_${Math.random()}`;

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE_NAME }, { ignore: [404] });
      });

      it('Creates index template', async () => {
        await testSubjects.click('createTemplateButton');

        await testSubjects.setValue('nameField', TEST_TEMPLATE_NAME);
        await testSubjects.setValue('indexPatternsField', 'test*');

        // Click form summary step and then the submit button
        await testSubjects.click('formWizardStep-5');
        await testSubjects.click('nextButton');

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('stepTitle')).to.contain(TEST_TEMPLATE_NAME);
        });
      });
    });
  });
};
