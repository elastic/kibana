/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

  describe('Find SLOs using kql query', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();

      await generate({ client: esClient, config: DATA_FORGE_CONFIG, logger });

      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });

      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('searches SLOs using kqlQuery', async () => {
      const createResponse1 = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      const createResponse2 = await sloApi.create(
        Object.assign({}, DEFAULT_SLO, { name: 'something irrelevant foo' }),
        adminRoleAuthc
      );

      const sloId1 = createResponse1.id;
      const sloId2 = createResponse2.id;

      // search SLOs
      await retry.tryForTime(180 * 1000, async () => {
        let response = await supertestWithoutAuth
          .get(`/api/observability/slos`)
          .query({ page: 1, perPage: 333 })
          .set(adminRoleAuthc.apiKeyHeader)
          .set(internalHeaders)
          .send();

        expect(response.body.results).length(2);
        expect(response.body.page).eql(1);
        expect(response.body.perPage).eql(333);
        expect(response.body.total).eql(2);

        response = await supertestWithoutAuth
          .get(`/api/observability/slos`)
          .query({ size: 222, kqlQuery: 'slo.name:irrelevant' })
          .set(adminRoleAuthc.apiKeyHeader)
          .set(internalHeaders)
          .send()
          .expect(200);

        expect(response.body.page).eql(1); // always return page with default value
        expect(response.body.perPage).eql(25); // always return perPage with default value
        expect(response.body.size).eql(222);
        expect(response.body.searchAfter).ok();
        expect(response.body.results).length(1);
        expect(response.body.results[0].id).eql(sloId2);

        response = await supertestWithoutAuth
          .get(`/api/observability/slos`)
          .query({ kqlQuery: 'slo.name:integration' })
          .set(adminRoleAuthc.apiKeyHeader)
          .set(internalHeaders)
          .send()
          .expect(200);

        expect(response.body.results).length(1);
        expect(response.body.results[0].id).eql(sloId1);

        return true;
      });
    });
  });
}
