/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { componentTemplatesApi } from './lib/component_templates.api';
import { componentTemplateHelpers } from './lib/component_template.helpers';
import { API_BASE_PATH } from './constants';

const CACHE_TEMPLATES = true;

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');

  const {
    createComponentTemplate,
    getAllComponentTemplates,
    getOneComponentTemplate,
    updateComponentTemplate,
    deleteComponentTemplate,
    getComponentTemplateDatastreams,
  } = componentTemplatesApi(getService);
  const {
    addDatastream,
    addIndexTemplate,
    addComponentTemplate,
    removeComponentTemplate,
    cleanupDatastreams,
    cleanUpIndexTemplates,
    cleanUpComponentTemplates,
  } = componentTemplateHelpers(getService);

  describe('Component templates', function () {
    after(async () => {
      await cleanUpIndexTemplates();
      await cleanUpComponentTemplates();
      await cleanupDatastreams();
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
            _source: {
              enabled: false,
            },
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
          await addComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }, CACHE_TEMPLATES);
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      describe('all component templates', () => {
        it('should return an array of component templates', async () => {
          const { body: componentTemplates } = await getAllComponentTemplates().expect(200);

          const testComponentTemplate = componentTemplates.find(
            ({ name }: { name: string }) => name === COMPONENT_NAME
          );

          expect(testComponentTemplate).to.eql({
            name: COMPONENT_NAME,
            usedBy: [],
            isManaged: false,
            hasSettings: true,
            hasMappings: true,
            hasAliases: false,
          });
        });
      });

      describe('one component template', () => {
        it('should return a single component template', async () => {
          const { body } = await getOneComponentTemplate(COMPONENT_NAME).expect(200);

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

    describe('Create', () => {
      const COMPONENT_NAME = 'test_create_component_template';
      const REQUIRED_FIELDS_COMPONENT_NAME = 'test_create_required_fields_component_template';

      after(async () => {
        // Clean up any component templates created in test cases
        await Promise.all(
          [COMPONENT_NAME, REQUIRED_FIELDS_COMPONENT_NAME].map(removeComponentTemplate)
        ).catch((err) => {
          log.debug(`[Cleanup error] Error deleting component templates: ${err.message}`);
          throw err;
        });
      });

      it('should create a component template', async () => {
        const { body } = await createComponentTemplate(COMPONENT_NAME, {
          version: 1,
          template: {
            settings: {
              number_of_shards: 1,
            },
            aliases: {
              alias1: {},
            },
            mappings: {
              properties: {
                host_name: {
                  type: 'keyword',
                },
              },
            },
            lifecycle: {
              // @ts-expect-error @elastic/elasticsearch enabled prop is still not in the ES types
              enabled: true,
              data_retention: '2d',
            },
          },
          _meta: {
            description: 'set number of shards to one',
            serialization: {
              class: 'MyComponentTemplate',
              id: 10,
            },
          },
          _kbnMeta: {
            usedBy: [],
            isManaged: false,
          },
        }).expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should create a component template with only required fields', async () => {
        const { body } = await createComponentTemplate(REQUIRED_FIELDS_COMPONENT_NAME, {
          // Excludes version and _meta fields
          template: {},
          _kbnMeta: {
            usedBy: [],
            isManaged: false,
          },
        }).expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of a component template with the same name of an existing one', async () => {
        const { body } = await createComponentTemplate(COMPONENT_NAME, {
          template: {},
          _kbnMeta: {
            usedBy: [],
            isManaged: false,
          },
        }).expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a component template with name '${COMPONENT_NAME}'.`,
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
            _source: {
              enabled: false,
            },
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
          await addComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }, CACHE_TEMPLATES);
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      it('should allow an existing component template to be updated', async () => {
        const { body } = await updateComponentTemplate(COMPONENT_NAME, {
          ...COMPONENT,
          version: 1,
          _kbnMeta: {
            usedBy: [],
            isManaged: false,
          },
        }).expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing component template to be updated', async () => {
        const { body } = await updateComponentTemplate('component_does_not_exist', {
          ...COMPONENT,
          version: 1,
          _kbnMeta: {
            usedBy: [],
            isManaged: false,
          },
        }).expect(404);

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
            (template) => addComponentTemplate(template, !CACHE_TEMPLATES)
          )
        ).catch((err) => {
          log.debug(`[Setup error] Error creating component templates: ${err.message}`);
          throw err;
        });
      });

      it('should delete a component template', async () => {
        const { name } = componentTemplateA;
        const { body } = await deleteComponentTemplate(name).expect(200);

        expect(body).to.eql({
          itemsDeleted: [name],
          errors: [],
        });
      });

      it('should delete multiple component templates', async () => {
        const { name: componentTemplate1Name } = componentTemplateB;
        const { name: componentTemplate2Name } = componentTemplateC;

        const {
          body: { itemsDeleted, errors },
        } = await deleteComponentTemplate(
          `${componentTemplate1Name},${componentTemplate2Name}`
        ).expect(200);

        expect(errors).to.eql([]);

        // The itemsDeleted array order isn't guaranteed, so we assert against each name instead
        [componentTemplate1Name, componentTemplate2Name].forEach((componentName) => {
          expect(itemsDeleted.includes(componentName)).to.be(true);
        });
      });

      it('should return an error for any component templates not sucessfully deleted', async () => {
        const COMPONENT_DOES_NOT_EXIST = 'component_does_not_exist';
        const { name: componentTemplateName } = componentTemplateD;

        const { body } = await deleteComponentTemplate(
          `${componentTemplateName},${COMPONENT_DOES_NOT_EXIST}`
        ).expect(200);
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

    describe('Privileges', () => {
      it('should return privileges result', async () => {
        const uri = `${API_BASE_PATH}/component_templates/privileges`;

        const { body } = await supertest.get(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          hasAllPrivileges: true,
          missingPrivileges: {
            cluster: [],
          },
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
            _source: {
              enabled: false,
            },
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
          await addComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }, CACHE_TEMPLATES);
          await addIndexTemplate({ body: TEMPLATE, name: TEMPLATE_NAME }, CACHE_TEMPLATES);
        } catch (err) {
          log.debug('[Setup error] Error creating component template');
          throw err;
        }
      });

      describe('without datastreams', () => {
        it('should return no datastreams', async () => {
          const { body } = await getComponentTemplateDatastreams(COMPONENT_NAME).expect(200);

          expect(body).to.eql({ data_streams: [] });
        });
      });

      describe('with datastreams', () => {
        before(async () => {
          await addDatastream(DATASTREAM_NAME, CACHE_TEMPLATES);
        });
        it('should return datastreams', async () => {
          const { body } = await getComponentTemplateDatastreams(COMPONENT_NAME).expect(200);

          expect(body).to.eql({ data_streams: ['logs-test-component-template-default'] });
        });
      });
    });
  });
}
