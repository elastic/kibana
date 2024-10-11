/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { getSLOSummaryTransformId, getSLOTransformId } from '@kbn/slo-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');
  const dataViewApi = getService('dataViewApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

  describe('Update SLOs', function () {
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

    afterEach(async () => {
      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    it('updates the definition without a revision bump', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      const sloId = createResponse.id;

      const getResponse = await sloApi.get(sloId, adminRoleAuthc);
      expect(getResponse).property('revision', 1);

      const updateResponse = await sloApi.update(
        { sloId, slo: Object.assign({}, DEFAULT_SLO, { name: 'updated name' }) },
        adminRoleAuthc
      );
      expect(updateResponse).property('revision', 1);
      expect(updateResponse).property('name', 'updated name');

      await assertTransformExist(getSLOTransformId(sloId, 1));
      await assertTransformExist(getSLOSummaryTransformId(sloId, 1));
    });

    it('updates the definition with a revision bump', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      const sloId = createResponse.id;

      const getResponse = await sloApi.get(sloId, adminRoleAuthc);
      expect(getResponse).property('revision', 1);

      const updateResponse = await sloApi.update(
        { sloId, slo: Object.assign({}, DEFAULT_SLO, { objective: { target: 0.63 } }) },
        adminRoleAuthc
      );
      expect(updateResponse).property('revision', 2);
      expect(updateResponse.objective).eql({ target: 0.63 });

      await assertTransformDeleted(getSLOTransformId(sloId, 1));
      await assertTransformDeleted(getSLOSummaryTransformId(sloId, 1));

      await assertTransformExist(getSLOTransformId(sloId, 2));
      await assertTransformExist(getSLOSummaryTransformId(sloId, 2));
    });
  });

  async function assertTransformDeleted(transformId: string) {
    return await retry.tryWithRetries(
      `Wait for transform ${transformId} to be deleted`,
      async () => {
        await supertestWithoutAuth
          .get(`/internal/transform/transforms/${transformId}`)
          .set(adminRoleAuthc.apiKeyHeader)
          .set(internalHeaders)
          .set('elastic-api-version', '1')
          .send()
          .timeout(10000)
          .expect(404);
      },
      { retryCount: 5, retryDelay: 2000 }
    );
  }

  async function assertTransformExist(transformId: string) {
    return await retry.tryWithRetries(
      `Wait for transform ${transformId} to exist`,
      async () => {
        await supertestWithoutAuth
          .get(`/internal/transform/transforms/${transformId}`)
          .set(adminRoleAuthc.apiKeyHeader)
          .set(internalHeaders)
          .set('elastic-api-version', '1')
          .send()
          .timeout(10000)
          .expect(200);
      },
      { retryCount: 5, retryDelay: 2000 }
    );
  }
}
