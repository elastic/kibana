/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { getSLOSummaryTransformId, getSLOTransformId } from '@kbn/slo-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';
import { TransformHelper, createTransformHelper } from './helpers/transform';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;
  let transformHelper: TransformHelper;

  describe('Update SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      transformHelper = createTransformHelper(getService);

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

      await transformHelper.assertExist(getSLOTransformId(sloId, 1));
      await transformHelper.assertExist(getSLOSummaryTransformId(sloId, 1));
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

      await transformHelper.assertNotFound(getSLOTransformId(sloId, 1));
      await transformHelper.assertNotFound(getSLOSummaryTransformId(sloId, 1));

      await transformHelper.assertExist(getSLOTransformId(sloId, 2));
      await transformHelper.assertExist(getSLOSummaryTransformId(sloId, 2));
    });
  });
}
