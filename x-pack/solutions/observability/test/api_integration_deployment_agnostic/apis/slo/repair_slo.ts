/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { getSLOTransformId, getSLOSummaryTransformId } from '@kbn/slo-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';
import { createTransformHelper } from './helpers/transform';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');
  const transformHelper = createTransformHelper(getService);

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;

  describe('Repair SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

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
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
    });

    it('repairs missing rollup transform by recreating it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Setup
      const rollupTransform = await transformHelper.assertExist(
        getSLOTransformId(sloId, sloRevision)
      );
      expect(rollupTransform.transforms).to.have.length(1);

      await esClient.transform.deleteTransform({
        transform_id: getSLOTransformId(sloId, sloRevision),
        force: true,
      });

      await transformHelper.assertNotFound(getSLOTransformId(sloId, sloRevision));

      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the rollup transform is recreated
      await retry.tryForTime(60 * 1000, async () => {
        const rollupTransformFinalStats = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(rollupTransformFinalStats.transforms).to.have.length(1);
        expect(rollupTransformFinalStats.transforms[0].state).to.eql('started');
        return true;
      });
    });

    it('repairs missing summary transform by recreating it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Setup
      const summaryTransform = await transformHelper.assertExist(
        getSLOSummaryTransformId(sloId, sloRevision)
      );
      expect(summaryTransform.transforms).to.have.length(1);

      await esClient.transform.deleteTransform({
        transform_id: getSLOSummaryTransformId(sloId, sloRevision),
        force: true,
      });

      await transformHelper.assertNotFound(getSLOSummaryTransformId(sloId, sloRevision));

      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the summary transform is recreated
      await retry.tryForTime(60 * 1000, async () => {
        const summaryTransformFinalStats = await esClient.transform.getTransformStats({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
        });
        expect(summaryTransformFinalStats.transforms).to.have.length(1);
        expect(summaryTransformFinalStats.transforms[0].state).to.eql('started');
        return true;
      });
    });

    it('repairs stopped transform by starting it when SLO is enabled', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Setup
      await transformHelper.assertExist(getSLOTransformId(sloId, sloRevision));

      await esClient.transform.stopTransform({
        transform_id: getSLOTransformId(sloId, sloRevision),
        wait_for_completion: true,
      });

      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('stopped');
        return true;
      });

      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the transform is started again after repair
      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('started');
        return true;
      });
    });

    it('repairs started transform by stopping it when SLO should be disabled', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Setup
      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('started');
        return true;
      });

      await sloApi.disable({ sloId }, adminRoleAuthc);

      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the transform is stopped
      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('stopped');
        return true;
      });
    });

    it('repairs missing rollup transform for disabled SLO by recreating and stopping it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Setup
      const rollupTransform = await transformHelper.assertExist(
        getSLOTransformId(sloId, sloRevision)
      );
      expect(rollupTransform.transforms).to.have.length(1);

      await sloApi.disable({ sloId }, adminRoleAuthc);

      await esClient.transform.deleteTransform({
        transform_id: getSLOTransformId(sloId, sloRevision),
      });

      await transformHelper.assertNotFound(getSLOTransformId(sloId, sloRevision));

      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the rollup transform is recreated and stopped (since SLO is disabled)
      await transformHelper.assertExist(getSLOTransformId(sloId, sloRevision));
      const rollupTransformFinalStats = await esClient.transform.getTransformStats({
        transform_id: getSLOTransformId(sloId, sloRevision),
      });
      expect(rollupTransformFinalStats.transforms).to.have.length(1);
      expect(rollupTransformFinalStats.transforms[0].state).to.eql('stopped');
    });
  });
}
