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
  const spaceApi = getService('spaces');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  let adminRoleAuthc: RoleCredentials;

  describe('Find SLO Template tags', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('GET /api/observability/slo_templates/_tags', () => {
      describe('when templates exist', () => {
        const TEMPLATE_IDS = [
          'find-tags-template-alpha',
          'find-tags-template-bravo',
          'find-tags-template-charlie',
        ];

        before(async () => {
          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[0],
            attributes: {
              name: 'Template Alpha',
              tags: ['gamma', 'alpha', 'beta'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[1],
            attributes: {
              name: 'Template Bravo',
              tags: ['beta', 'delta'],
            },
            overwrite: true,
          });

          await kibanaServer.savedObjects.create({
            type: SLO_TEMPLATE_SO_TYPE,
            id: TEMPLATE_IDS[2],
            attributes: {
              name: 'Template Charlie',
              tags: ['alpha', 'epsilon'],
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

        it('returns unique tags sorted alphabetically', async () => {
          const response = await sloApi.findTemplateTags(adminRoleAuthc);

          expect(response.tags).to.eql(['alpha', 'beta', 'delta', 'epsilon', 'gamma']);
        });
      });

      describe('when no templates exist', () => {
        const SPACE_ID = 'slo-template-tags-empty-space';

        before(async () => {
          await spaceApi.create({
            id: SPACE_ID,
            name: 'SLO Template Tags Empty Space',
            initials: 'SE',
          });
        });

        after(async () => {
          await spaceApi.delete(SPACE_ID);
        });

        it('returns an empty array', async () => {
          const { body: response } = await supertestWithoutAuth
            .get(`/s/${SPACE_ID}/api/observability/slo_templates/_tags`)
            .set(adminRoleAuthc.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(200);

          expect(response.tags).to.eql([]);
        });
      });
    });
  });
}
