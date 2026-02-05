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

  describe('Find SLO Templates', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('GET /api/observability/slo_templates', () => {
      describe('pagination', () => {
        const TEMPLATE_IDS = [
          'pagination-template-1',
          'pagination-template-2',
          'pagination-template-3',
          'pagination-template-4',
          'pagination-template-5',
        ];

        before(async () => {
          for (let i = 0; i < TEMPLATE_IDS.length; i++) {
            await kibanaServer.savedObjects.create({
              type: SLO_TEMPLATE_SO_TYPE,
              id: TEMPLATE_IDS[i],
              attributes: {
                name: `Pagination Template ${i + 1}`,
                description: `Template ${i + 1} for pagination tests`,
                tags: ['pagination-test'],
              },
              overwrite: true,
            });
          }
        });

        after(async () => {
          for (const id of TEMPLATE_IDS) {
            await kibanaServer.savedObjects.delete({
              type: SLO_TEMPLATE_SO_TYPE,
              id,
            });
          }
        });

        it('returns templates with default pagination', async () => {
          const response = await sloApi.findTemplates({}, adminRoleAuthc);

          expect(response.page).to.eql(1);
          expect(response.perPage).to.eql(20);
          expect(response.total).to.be.greaterThan(0);
          expect(response.results).to.be.an('array');
          expect(response.results.every((t) => t.templateId)).to.be(true);
        });

        it('returns templates with custom page and perPage', async () => {
          const response = await sloApi.findTemplates({ page: 1, perPage: 2 }, adminRoleAuthc);

          expect(response.page).to.eql(1);
          expect(response.perPage).to.eql(2);
          expect(response.total).to.be.greaterThan(0);
          expect(response.results.length).to.eql(2);
          expect(response.results.every((t) => t.templateId)).to.be(true);
        });

        it('returns second page of results', async () => {
          const firstPage = await sloApi.findTemplates({ page: 1, perPage: 2 }, adminRoleAuthc);
          expect(firstPage.total).to.eql(5);

          const secondPage = await sloApi.findTemplates({ page: 2, perPage: 2 }, adminRoleAuthc);
          expect(secondPage.total).to.eql(5);

          const firstPageNames = firstPage.results.map((t) => t.name);
          const secondPageNames = secondPage.results.map((t) => t.name);
          const overlap = firstPageNames.filter((name) => secondPageNames.includes(name));
          expect(overlap.length).to.eql(0);
        });
      });

      describe('search by name', () => {
        const TEMPLATE_IDS = [
          'search-alpha-template',
          'search-beta-template',
          'search-gamma-template',
        ];

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[0],
            attributes: {
              name: 'Alpha Service Availability',
              description: 'Availability SLO for Alpha service',
              tags: ['search-test', 'availability'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[1],
            attributes: {
              name: 'Beta Service Latency',
              description: 'Latency SLO for Beta service',
              tags: ['search-test', 'latency'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[2],
            attributes: {
              name: 'Gamma Service Errors',
              description: 'Error rate SLO for Gamma service',
              tags: ['search-test', 'errors'],
            },
            overwrite: true,
          });
        });

        after(async () => {
          for (const id of TEMPLATE_IDS) {
            await kibanaServer.savedObjects.delete({
              type: SLO_TEMPLATE_SO_TYPE,
              id,
            });
          }
        });

        it('finds templates matching search term in name', async () => {
          const response = await sloApi.findTemplates({ search: 'Alpha' }, adminRoleAuthc);

          expect(response.total).to.eql(1);
          expect(response.results[0].templateId).to.eql(TEMPLATE_IDS[0]);
          expect(response.results[0].name).to.eql('Alpha Service Availability');
        });

        it('finds templates with partial name match', async () => {
          const response = await sloApi.findTemplates({ search: 'Service' }, adminRoleAuthc);

          expect(response.total).to.eql(3);
          const templateIds = response.results.map((t) => t.templateId);
          expect(TEMPLATE_IDS.every((id) => templateIds.includes(id))).to.be(true);
          const names = response.results.map((t) => t.name);
          expect(names.every((name) => name?.includes('Service'))).to.be(true);
        });

        it('returns empty results for non-matching search', async () => {
          const response = await sloApi.findTemplates(
            { search: 'NonExistentTemplate' },
            adminRoleAuthc
          );

          expect(response.results.length).to.eql(0);
          expect(response.total).to.eql(0);
        });
      });

      describe('filter by tags', () => {
        const TEMPLATE_IDS = ['tags-prod-template', 'tags-staging-template', 'tags-both-template'];

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[0],
            attributes: {
              name: 'Production Only Template',
              tags: ['production', 'critical'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[1],
            attributes: {
              name: 'Staging Only Template',
              tags: ['staging', 'testing'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[2],
            attributes: {
              name: 'Production and Staging Template',
              tags: ['production', 'staging'],
            },
            overwrite: true,
          });
        });

        after(async () => {
          for (const id of TEMPLATE_IDS) {
            await kibanaServer.savedObjects.delete({
              type: SLO_TEMPLATE_SO_TYPE,
              id,
            });
          }
        });

        it('finds templates with specific tag', async () => {
          const response = await sloApi.findTemplates({ tags: ['production'] }, adminRoleAuthc);

          expect(response.total).to.eql(2);
          const templateIds = response.results.map((t) => t.templateId);
          expect(templateIds).to.contain(TEMPLATE_IDS[0]);
          expect(templateIds).to.contain(TEMPLATE_IDS[2]);
          const allHaveTag = response.results.every((t) => t.tags?.includes('production'));
          expect(allHaveTag).to.be(true);
        });

        it('finds templates matching any of multiple tags (OR logic)', async () => {
          const response = await sloApi.findTemplates(
            { tags: ['critical', 'testing'] },
            adminRoleAuthc
          );

          expect(response.total).to.eql(2);
          const allHaveAtLeastOneTag = response.results.every(
            (t) => t.tags?.includes('critical') || t.tags?.includes('testing')
          );
          expect(allHaveAtLeastOneTag).to.be(true);
        });

        it('returns empty results for non-existent tag', async () => {
          const response = await sloApi.findTemplates(
            { tags: ['non-existent-tag'] },
            adminRoleAuthc
          );

          expect(response.total).to.eql(0);
          expect(response.results.length).to.eql(0);
        });
      });

      describe('combined search and tags', () => {
        const TEMPLATE_IDS = ['combined-api-prod', 'combined-api-staging', 'combined-web-prod'];

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[0],
            attributes: {
              name: 'API Gateway Production',
              tags: ['api', 'production'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[1],
            attributes: {
              name: 'API Gateway Staging',
              tags: ['api', 'staging'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[2],
            attributes: {
              name: 'Web Frontend Production',
              tags: ['web', 'production'],
            },
            overwrite: true,
          });
        });

        after(async () => {
          for (const id of TEMPLATE_IDS) {
            await kibanaServer.savedObjects.delete({
              type: SLO_TEMPLATE_SO_TYPE,
              id,
            });
          }
        });

        it('combines search and tag filter', async () => {
          const response = await sloApi.findTemplates(
            { search: 'API', tags: ['production'] },
            adminRoleAuthc
          );

          expect(response.total).to.eql(1);
          expect(response.results[0].templateId).to.eql(TEMPLATE_IDS[0]);
          expect(response.results[0].name).to.eql('API Gateway Production');
          expect(response.results[0].tags).to.contain('production');
        });
      });

      describe('validation errors', () => {
        it('returns error when page is zero', async () => {
          const response = (await sloApi.findTemplates(
            { page: 0 },
            adminRoleAuthc,
            400
          )) as unknown as { statusCode: number; message: string };

          expect(response.statusCode).to.eql(400);
          expect(response.message).to.contain('page must be a positive integer');
        });

        it('returns error when page is negative', async () => {
          const response = (await sloApi.findTemplates(
            { page: -1 },
            adminRoleAuthc,
            400
          )) as unknown as { statusCode: number; message: string };

          expect(response.statusCode).to.eql(400);
          expect(response.message).to.contain('page must be a positive integer');
        });

        it('returns error when perPage exceeds 100', async () => {
          const response = (await sloApi.findTemplates(
            { perPage: 101 },
            adminRoleAuthc,
            400
          )) as unknown as { statusCode: number; message: string };

          expect(response.statusCode).to.eql(400);
          expect(response.message).to.contain('perPage cannot be greater than 100');
        });
      });
    });
  });
}
