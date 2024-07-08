/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

const CACHE_TEMPLATES = true;

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const svlComponentTemplatesApi = getService('svlComponentTemplatesApi');
  const svlComponentTemplateHelpers = getService('svlComponentTemplateHelpers');

  // Failing: See https://github.com/elastic/kibana/issues/182792
  // Failing: See https://github.com/elastic/kibana/issues/182797
  // Failing: See https://github.com/elastic/kibana/issues/182791
  describe.skip('component templates', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlComponentTemplateHelpers.cleanUpIndexTemplates();
      await svlComponentTemplateHelpers.cleanUpComponentTemplates();
      await svlComponentTemplateHelpers.cleanupDatastreams();
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('Get', () => {
      const COMPONENT_NAME = 'test_get_component_template';
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      };

      // Create component template to verify GET requests
      before(async () => {
        try {
          await svlComponentTemplateHelpers.addComponentTemplate(
            { body: COMPONENT, name: COMPONENT_NAME },
            CACHE_TEMPLATES
          );
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      describe('all component templates', () => {
        it('should return an array of component templates', async () => {
          const { body: componentTemplates, status } =
            await svlComponentTemplatesApi.getAllComponentTemplates(roleAuthc);

          svlCommonApi.assertResponseStatusCode(200, status, { componentTemplates });

          const testComponentTemplate = componentTemplates.find(
            ({ name }: { name: string }) => name === COMPONENT_NAME
          );

          expect(testComponentTemplate).to.eql({
            name: COMPONENT_NAME,
            usedBy: [],
            isManaged: false,
            hasSettings: true,
            isDeprecated: false,
            hasMappings: true,
            hasAliases: false,
          });
        });
      });

      describe('one component template', () => {
        it('should return a single component template', async () => {
          const { body, status } = await svlComponentTemplatesApi.getOneComponentTemplate(
            COMPONENT_NAME,
            roleAuthc
          );

          svlCommonApi.assertResponseStatusCode(200, status, body);

          expect(body).to.eql({
            name: COMPONENT_NAME,
            ...COMPONENT,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          });
        });
      });
    });

    describe('Update', () => {
      const COMPONENT_NAME = 'test_update_component_template';
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      };

      before(async () => {
        // Create component template that can be used to test PUT request
        try {
          await svlComponentTemplateHelpers.addComponentTemplate(
            { body: COMPONENT, name: COMPONENT_NAME },
            CACHE_TEMPLATES
          );
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      it('should allow an existing component template to be updated', async () => {
        const { body, status } = await svlComponentTemplatesApi.updateComponentTemplate(
          COMPONENT_NAME,
          {
            ...COMPONENT,
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          },
          roleAuthc
        );

        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing component template to be updated', async () => {
        const { body, status } = await svlComponentTemplatesApi.updateComponentTemplate(
          'component_does_not_exist',
          {
            ...COMPONENT,
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          },
          roleAuthc
        );

        svlCommonApi.assertResponseStatusCode(400, status, body);

        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message: 'component template matching [component_does_not_exist] not found',
          attributes: {
            error: {
              reason: 'component template matching [component_does_not_exist] not found',
              root_cause: [
                {
                  reason: 'component template matching [component_does_not_exist] not found',
                  type: 'resource_not_found_exception',
                },
              ],
              type: 'resource_not_found_exception',
            },
          },
        });
      });
    });

    describe('Update', () => {
      const COMPONENT_NAME = 'test_update_component_template';
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      };

      before(async () => {
        // Create component template that can be used to test PUT request
        try {
          await svlComponentTemplateHelpers.addComponentTemplate(
            { body: COMPONENT, name: COMPONENT_NAME },
            CACHE_TEMPLATES
          );
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      it('should allow an existing component template to be updated', async () => {
        const { body, status } = await svlComponentTemplatesApi.updateComponentTemplate(
          COMPONENT_NAME,
          {
            ...COMPONENT,
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          },
          roleAuthc
        );

        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing component template to be updated', async () => {
        const { body, status } = await svlComponentTemplatesApi.updateComponentTemplate(
          'component_does_not_exist',
          {
            ...COMPONENT,
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          },
          roleAuthc
        );
        svlCommonApi.assertResponseStatusCode(404, status, body);

        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message: 'component template matching [component_does_not_exist] not found',
          attributes: {
            error: {
              reason: 'component template matching [component_does_not_exist] not found',
              root_cause: [
                {
                  reason: 'component template matching [component_does_not_exist] not found',
                  type: 'resource_not_found_exception',
                },
              ],
              type: 'resource_not_found_exception',
            },
          },
        });
      });
    });

    describe('Delete', () => {
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
        },
      };

      const componentTemplateA = { body: COMPONENT, name: 'test_delete_component_template_a' };
      const componentTemplateB = { body: COMPONENT, name: 'test_delete_component_template_b' };
      const componentTemplateC = { body: COMPONENT, name: 'test_delete_component_template_c' };
      const componentTemplateD = { body: COMPONENT, name: 'test_delete_component_template_d' };

      before(async () => {
        // Create several component templates that can be used to test deletion
        await Promise.all(
          [componentTemplateA, componentTemplateB, componentTemplateC, componentTemplateD].map(
            (template) =>
              svlComponentTemplateHelpers.addComponentTemplate(template, !CACHE_TEMPLATES)
          )
        ).catch((err) => {
          log.debug(`[Setup error] Error creating component templates: ${err.message}`);
          throw err;
        });
      });

      it('should delete a component template', async () => {
        const { name } = componentTemplateA;
        const { status, body } = await svlComponentTemplatesApi.deleteComponentTemplate(
          name,
          roleAuthc
        );
        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body).to.eql({
          itemsDeleted: [name],
          errors: [],
        });
      });

      it('should delete multiple component templates', async () => {
        const { name: componentTemplate1Name } = componentTemplateB;
        const { name: componentTemplate2Name } = componentTemplateC;

        const {
          status,
          body: { itemsDeleted, errors },
        } = await svlComponentTemplatesApi.deleteComponentTemplate(
          `${componentTemplate1Name},${componentTemplate2Name}`,
          roleAuthc
        );
        svlCommonApi.assertResponseStatusCode(200, status, { itemsDeleted, errors });

        expect(errors).to.eql([]);

        // The itemsDeleted array order isn't guaranteed, so we assert against each name instead
        [componentTemplate1Name, componentTemplate2Name].forEach((componentName) => {
          expect(itemsDeleted.includes(componentName)).to.be(true);
        });
      });

      it('should return an error for any component templates not sucessfully deleted', async () => {
        const COMPONENT_DOES_NOT_EXIST = 'component_does_not_exist';
        const { name: componentTemplateName } = componentTemplateD;

        const { body, status } = await svlComponentTemplatesApi.deleteComponentTemplate(
          `${componentTemplateName},${COMPONENT_DOES_NOT_EXIST}`,
          roleAuthc
        );
        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body.itemsDeleted).to.eql([componentTemplateName]);
        expect(body.errors[0].name).to.eql(COMPONENT_DOES_NOT_EXIST);

        expect(body.errors[0].error.payload.attributes.error).to.eql({
          root_cause: [
            {
              type: 'resource_not_found_exception',
              reason: 'component_does_not_exist',
            },
          ],
          type: 'resource_not_found_exception',
          reason: 'component_does_not_exist',
        });
      });
    });

    describe('Get datastreams', () => {
      const COMPONENT_NAME = 'test_get_component_template_datastreams';
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      };
      const DATASTREAM_NAME = 'logs-test-component-template-default';
      const INDEX_PATTERN = 'logs-test-component-template-*';
      const TEMPLATE_NAME = 'test_get_component_template_datastreams';
      const TEMPLATE = {
        index_patterns: INDEX_PATTERN,
        composed_of: [COMPONENT_NAME],
      };

      // Create component template to verify GET requests
      before(async () => {
        try {
          await svlComponentTemplateHelpers.addComponentTemplate(
            { body: COMPONENT, name: COMPONENT_NAME },
            CACHE_TEMPLATES
          );
          await svlComponentTemplateHelpers.addIndexTemplate(
            { body: TEMPLATE, name: TEMPLATE_NAME },
            CACHE_TEMPLATES
          );
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      describe('without datastreams', () => {
        it('should return no datastreams', async () => {
          const { body, status } = await svlComponentTemplatesApi.getComponentTemplateDatastreams(
            COMPONENT_NAME,
            roleAuthc
          );
          svlCommonApi.assertResponseStatusCode(200, status, body);

          expect(body).to.eql({ data_streams: [] });
        });
      });

      describe('with datastreams', () => {
        before(async () => {
          await svlComponentTemplateHelpers.addDatastream(DATASTREAM_NAME, CACHE_TEMPLATES);
        });
        it('should return datastreams', async () => {
          const { body, status } = await svlComponentTemplatesApi.getComponentTemplateDatastreams(
            COMPONENT_NAME,
            roleAuthc
          );
          svlCommonApi.assertResponseStatusCode(200, status, body);

          expect(body).to.eql({ data_streams: ['logs-test-component-template-default'] });
        });
      });
    });
  });
}
