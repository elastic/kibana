/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

const SLO_TEMPLATE_SO_TYPE = 'slo_template';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');
  const kibanaServer = getService('kibanaServer');

  let adminRoleAuthc: RoleCredentials;

  describe('Get SLO Template', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('GET /api/observability/slo_templates/{templateId}', () => {
      describe('handles full valid template', () => {
        const TEMPLATE_ID = 'full-valid-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              name: 'Full Template',
              description: 'A complete SLO template',
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index: 'test-index-*',
                  filter: 'field: value',
                  good: 'status: success',
                  total: 'status: *',
                  timestampField: '@timestamp',
                },
              },
              budgetingMethod: 'occurrences',
              objective: {
                target: 0.99,
              },
              timeWindow: {
                duration: '7d',
                type: 'rolling',
              },
              tags: ['production', 'api'],
              settings: {
                frequency: '1m',
                syncDelay: '1m',
              },
              groupBy: ['host.name', 'service.name'],
              artifacts: {
                dashboards: [{ id: 'dashboard-1' }, { id: 'dashboard-2' }],
              },
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns all valid fields', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);
          expect(template.name).to.eql('Full Template');
          expect(template.description).to.eql('A complete SLO template');
          expect(template.budgetingMethod).to.eql('occurrences');
          expect(template.objective).to.eql({ target: 0.99 });
          expect(template.timeWindow).to.eql({ duration: '7d', type: 'rolling' });
          expect(template.tags).to.eql(['production', 'api']);
          expect(template.indicator).to.eql({
            type: 'sli.kql.custom',
            params: {
              index: 'test-index-*',
              filter: 'field: value',
              good: 'status: success',
              total: 'status: *',
              timestampField: '@timestamp',
            },
          });
          expect(template.settings).to.eql({
            frequency: '1m',
            syncDelay: '1m',
          });
          expect(template.groupBy).to.eql(['host.name', 'service.name']);
          expect(template.artifacts).to.eql({
            dashboards: [{ id: 'dashboard-1' }, { id: 'dashboard-2' }],
          });
        });
      });

      describe('handles template with timeslices budgeting method', () => {
        const TEMPLATE_ID = 'timeslices-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              name: 'Timeslices Template',
              description: 'A template using timeslices budgeting method',
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index: 'metrics-*',
                  filter: '',
                  good: 'response_time < 500',
                  total: '*',
                  timestampField: '@timestamp',
                },
              },
              budgetingMethod: 'timeslices',
              objective: {
                target: 0.95,
                timesliceTarget: 0.9,
                timesliceWindow: '5m',
              },
              timeWindow: {
                duration: '30d',
                type: 'rolling',
              },
              tags: ['latency', 'timeslices'],
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns template with timeslices objective fields', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);
          expect(template.name).to.eql('Timeslices Template');
          expect(template.budgetingMethod).to.eql('timeslices');
          expect(template.objective).to.eql({
            target: 0.95,
            timesliceTarget: 0.9,
            timesliceWindow: '5m',
          });
          expect(template.timeWindow).to.eql({ duration: '30d', type: 'rolling' });
          expect(template.tags).to.eql(['latency', 'timeslices']);
        });
      });

      describe('handles partial template with name only', () => {
        const TEMPLATE_ID = 'partial-name-only-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              name: 'Name Only Template',
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns only the name field', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);
          expect(template.name).to.eql('Name Only Template');
          expect(template.description).to.be(undefined);
          expect(template.indicator).to.be(undefined);
          expect(template.budgetingMethod).to.be(undefined);
          expect(template.objective).to.be(undefined);
          expect(template.timeWindow).to.be(undefined);
          expect(template.tags).to.be(undefined);
          expect(template.settings).to.be(undefined);
        });
      });

      describe('handles partial template with name and indicator', () => {
        const TEMPLATE_ID = 'partial-name-indicator-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              name: 'Name and Indicator Template',
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index: 'logs-*',
                  filter: '',
                  good: 'level: info',
                  total: '*',
                  timestampField: '@timestamp',
                },
              },
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns name and indicator fields', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);
          expect(template.name).to.eql('Name and Indicator Template');
          expect(template.indicator).to.eql({
            type: 'sli.kql.custom',
            params: {
              index: 'logs-*',
              filter: '',
              good: 'level: info',
              total: '*',
              timestampField: '@timestamp',
            },
          });
          expect(template.description).to.be(undefined);
          expect(template.budgetingMethod).to.be(undefined);
          expect(template.objective).to.be(undefined);
          expect(template.timeWindow).to.be(undefined);
          expect(template.tags).to.be(undefined);
          expect(template.settings).to.be(undefined);
        });
      });

      describe('handles template with invalid fields', () => {
        const TEMPLATE_ID = 'invalid-fields-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              name: 'Valid Name',
              description: 'Valid description',
              // Invalid indicator - missing required params
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  // Missing required fields like 'good', 'total', 'index'
                  invalidField: 'invalid value',
                },
              },
              // Invalid budgetingMethod - not a valid enum value
              budgetingMethod: 'invalid-method',
              // Invalid objective - wrong structure
              objective: 'not-an-object',
              // Invalid timeWindow - wrong structure
              timeWindow: 12345,
              // Invalid tags - not an array
              tags: 'not-an-array',
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns only valid fields, filtering out invalid ones', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);
          expect(template.name).to.eql('Valid Name');
          expect(template.description).to.eql('Valid description');

          expect(template.indicator).to.be(undefined);
          expect(template.budgetingMethod).to.be(undefined);
          expect(template.objective).to.be(undefined);
          expect(template.timeWindow).to.be(undefined);
          expect(template.tags).to.be(undefined);
        });
      });

      describe('handles empty template', () => {
        const TEMPLATE_ID = 'empty-template';

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
            attributes: {
              // No valid fields - all fields have invalid types
              name: 12345, // should be string
              description: true, // should be string
            },
            overwrite: true,
          });
        });

        after(async () => {
          await kibanaServer.savedObjects.delete({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_ID,
          });
        });

        it('returns only templateId when no other fields are valid', async () => {
          const template = await sloApi.getTemplate(TEMPLATE_ID, adminRoleAuthc);

          expect(template.templateId).to.eql(TEMPLATE_ID);

          expect(template.name).to.be(undefined);
          expect(template.description).to.be(undefined);
          expect(template.indicator).to.be(undefined);
          expect(template.budgetingMethod).to.be(undefined);
          expect(template.objective).to.be(undefined);
          expect(template.timeWindow).to.be(undefined);
          expect(template.tags).to.be(undefined);
          expect(template.settings).to.be(undefined);
          expect(Object.keys(template).length).to.eql(1);
        });
      });

      describe('handles non-existent template', () => {
        it('returns 404 when template does not exist', async () => {
          const response = (await sloApi.getTemplate(
            'non-existent-template-id',
            adminRoleAuthc,
            404
          )) as unknown as { statusCode: number; message: string };

          expect(response.statusCode).to.eql(404);
          expect(response.message).to.contain(
            'SLO Template with id [non-existent-template-id] not found'
          );
        });
      });
    });
  });
}
