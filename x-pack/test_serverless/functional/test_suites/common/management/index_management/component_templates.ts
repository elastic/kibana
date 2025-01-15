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
  const samlAuth = getService('samlAuth');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  const TEST_COMPONENT_TEMPLATE = '.a_test_component_template';

  describe('Index component templates', function () {
    describe('with access', () => {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsAdmin();
      });

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the index templates tab
        await pageObjects.indexManagement.changeTabs('component_templatesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      it('renders the component templates tab', async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/component_templates`);
      });

      describe('Component templates list', () => {
        before(async () => {
          await es.cluster.putComponentTemplate({
            name: TEST_COMPONENT_TEMPLATE,
            body: {
              template: {
                settings: {
                  index: {
                    number_of_shards: 1,
                  },
                },
              },
            },
          });
        });

        after(async () => {
          await es.cluster.deleteComponentTemplate(
            { name: TEST_COMPONENT_TEMPLATE },
            { ignore: [404] }
          );
        });

        it('Displays the test component template in the list', async () => {
          const templates = await testSubjects.findAll('componentTemplateTableRow');

          const getTemplateName = async (template: WebElementWrapper) => {
            const templateNameElement = await template.findByTestSubject('templateDetailsLink');
            return await templateNameElement.getVisibleText();
          };

          const componentTemplateList = await Promise.all(
            templates.map((template) => getTemplateName(template))
          );

          const newComponentTemplateExists = Boolean(
            componentTemplateList.find((templateName) => templateName === TEST_COMPONENT_TEMPLATE)
          );

          expect(newComponentTemplateExists).to.be(true);
        });
      });

      describe('Create component template', () => {
        after(async () => {
          await es.cluster.deleteComponentTemplate(
            { name: TEST_COMPONENT_TEMPLATE },
            { ignore: [404] }
          );
        });

        it('Creates component template', async () => {
          await testSubjects.click('createPipelineButton');

          await testSubjects.setValue('nameField', TEST_COMPONENT_TEMPLATE);

          // Finish wizard flow
          await testSubjects.click('nextButton');
          await testSubjects.click('nextButton');
          await testSubjects.click('nextButton');
          await testSubjects.click('nextButton');
          await testSubjects.click('nextButton');

          expect(await testSubjects.getVisibleText('title')).to.contain(TEST_COMPONENT_TEMPLATE);
        });
      });
    });

    describe('no access', () => {
      this.tags(['skipSvlOblt', 'skipMKI']);
      before(async () => {
        await samlAuth.setCustomRole({
          elasticsearch: {
            cluster: ['monitor'],
            indices: [{ names: ['*'], privileges: ['all'] }],
          },
          kibana: [
            {
              base: ['all'],
              feature: {},
              spaces: ['*'],
            },
          ],
        });
        await pageObjects.svlCommonPage.loginWithCustomRole();
        await pageObjects.common.navigateToApp('indexManagement');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await samlAuth.deleteCustomRole();
      });

      it('hides the component templates tab', async () => {
        await testSubjects.missingOrFail('component_templatesTab');
      });
    });
  });
};
