/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
// @ts-ignore
import { initElasticsearchHelpers } from './lib';
// @ts-ignore
import { API_BASE_PATH } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const {
    createComponentTemplate,
    cleanUpComponentTemplates,
    deleteComponentTemplate,
  } = initElasticsearchHelpers(es);

  describe('Component templates', function () {
    after(async () => {
      await cleanUpComponentTemplates();
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
          await createComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }, true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating component template');
          throw err;
        }
      });

      describe('all component templates', () => {
        it('should return an array of component templates', async () => {
          const { body: componentTemplates } = await supertest
            .get(`${API_BASE_PATH}/component_templates`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

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
          const uri = `${API_BASE_PATH}/component_templates/${COMPONENT_NAME}`;

          const { body } = await supertest.get(uri).set('kbn-xsrf', 'xxx').expect(200);

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
          [COMPONENT_NAME, REQUIRED_FIELDS_COMPONENT_NAME].map(deleteComponentTemplate)
        ).catch((err) => {
          // eslint-disable-next-line no-console
          console.log(`[Cleanup error] Error deleting component templates: ${err.message}`);
          throw err;
        });
      });

      it('should create a component template', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/component_templates`)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: COMPONENT_NAME,
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
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should create a component template with only required fields', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/component_templates`)
          .set('kbn-xsrf', 'xxx')
          // Excludes version and _meta fields
          .send({
            name: REQUIRED_FIELDS_COMPONENT_NAME,
            template: {},
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of a component template with the same name of an existing one', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/component_templates`)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: COMPONENT_NAME,
            template: {},
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          })
          .expect(409);

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
          await createComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }, true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating component template');
          throw err;
        }
      });

      it('should allow an existing component template to be updated', async () => {
        const uri = `${API_BASE_PATH}/component_templates/${COMPONENT_NAME}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...COMPONENT,
            name: COMPONENT_NAME,
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing component template to be updated', async () => {
        const uri = `${API_BASE_PATH}/component_templates/component_does_not_exist`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...COMPONENT,
            name: 'component_does_not_exist',
            version: 1,
            _kbnMeta: {
              usedBy: [],
              isManaged: false,
            },
          })
          .expect(404);

        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message:
            '[resource_not_found_exception] component template matching [component_does_not_exist] not found',
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
          [
            componentTemplateA,
            componentTemplateB,
            componentTemplateC,
            componentTemplateD,
          ].map((template) => createComponentTemplate(template, false))
        ).catch((err) => {
          // eslint-disable-next-line no-console
          console.log(`[Setup error] Error creating component templates: ${err.message}`);
          throw err;
        });
      });

      it('should delete a component template', async () => {
        const { name } = componentTemplateA;
        const uri = `${API_BASE_PATH}/component_templates/${name}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          itemsDeleted: [name],
          errors: [],
        });
      });

      it('should delete multiple component templates', async () => {
        const { name: componentTemplate1Name } = componentTemplateB;
        const { name: componentTemplate2Name } = componentTemplateC;

        const uri = `${API_BASE_PATH}/component_templates/${componentTemplate1Name},${componentTemplate2Name}`;

        const {
          body: { itemsDeleted, errors },
        } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(errors).to.eql([]);

        // The itemsDeleted array order isn't guaranteed, so we assert against each name instead
        [componentTemplate1Name, componentTemplate2Name].forEach((componentName) => {
          expect(itemsDeleted.includes(componentName)).to.be(true);
        });
      });

      it('should return an error for any component templates not sucessfully deleted', async () => {
        const COMPONENT_DOES_NOT_EXIST = 'component_does_not_exist';
        const { name: componentTemplateName } = componentTemplateD;

        const uri = `${API_BASE_PATH}/component_templates/${componentTemplateName},${COMPONENT_DOES_NOT_EXIST}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body.itemsDeleted).to.eql([componentTemplateName]);
        expect(body.errors[0].name).to.eql(COMPONENT_DOES_NOT_EXIST);
        expect(body.errors[0].error.msg).to.contain('index_template_missing_exception');
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
  });
}
