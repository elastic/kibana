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
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  const TEST_TEMPLATE = 'a_test_template';

  // FLAKY: https://github.com/elastic/kibana/issues/172703
  // FLAKY: https://github.com/elastic/kibana/issues/172704
  describe.skip('Index Templates', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      // Navigate to the index management page
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
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE });
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
      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE });
      });

      it('Creates index template', async () => {
        await testSubjects.click('createTemplateButton');

        await testSubjects.setValue('nameField', TEST_TEMPLATE);
        await testSubjects.setValue('indexPatternsField', 'test*');

        // Finish wizard flow
        await testSubjects.click('nextButton');
        await testSubjects.click('nextButton');
        await testSubjects.click('nextButton');
        await testSubjects.click('nextButton');
        await testSubjects.click('nextButton');
        await testSubjects.click('nextButton');

        expect(await testSubjects.getVisibleText('title')).to.contain(TEST_TEMPLATE);
      });
    });
  });
};
