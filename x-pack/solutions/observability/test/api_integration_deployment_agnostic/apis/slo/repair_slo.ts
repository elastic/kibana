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
import type { RepairActionsGroupResult } from '@kbn/slo-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';
import { createTransformHelper } from './helpers/transform';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
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

      await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
    });

    it('repairs missing summary transform by recreating it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

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

      await transformHelper.assertTransformIsStarted(getSLOSummaryTransformId(sloId, sloRevision));
    });

    it('repairs stopped transform by starting it when SLO is enabled', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      await transformHelper.assertExist(getSLOTransformId(sloId, sloRevision));

      await esClient.transform.stopTransform({
        transform_id: getSLOTransformId(sloId, sloRevision),
        wait_for_completion: true,
      });

      await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));

      await sloApi.repair([sloId], adminRoleAuthc);

      await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
    });

    it('repairs started transform by stopping it when SLO should be disabled', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));

      await sloApi.disable({ sloId }, adminRoleAuthc);

      await sloApi.repair([sloId], adminRoleAuthc);

      await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));
    });

    it('repairs missing rollup transform for disabled SLO by recreating and stopping it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

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

      await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));
    });

    it('returns noop for multiple healthy SLOs', async () => {
      const [slo1, slo2, slo3] = await Promise.all([
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
      ]);

      const sloIds = [slo1.id, slo2.id, slo3.id];
      const sloRevision = 1;

      for (const sloId of sloIds) {
        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
        await transformHelper.assertTransformIsStarted(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
      }

      const results: RepairActionsGroupResult[] = await sloApi.repair(sloIds, adminRoleAuthc);

      expect(results).to.have.length(3);
      for (const result of results) {
        expect(sloIds).to.contain(result.id);
        expect(result.results).to.have.length(1);
        expect(result.results[0].action.type).to.eql('noop');
        expect(result.results[0].status).to.eql('success');
      }
    });

    it('returns noop for healthy SLOs and start-transform for SLO with stopped transforms', async () => {
      const [slo1, slo2, slo3] = await Promise.all([
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
        sloApi.create(DEFAULT_SLO, adminRoleAuthc),
      ]);

      const sloIds = [slo1.id, slo2.id, slo3.id];
      const sloRevision = 1;
      const stoppedSloId = slo3.id;

      for (const sloId of sloIds) {
        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
        await transformHelper.assertTransformIsStarted(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
      }

      await esClient.transform.stopTransform({
        transform_id: getSLOTransformId(stoppedSloId, sloRevision),
        wait_for_completion: true,
      });
      await esClient.transform.stopTransform({
        transform_id: getSLOSummaryTransformId(stoppedSloId, sloRevision),
        wait_for_completion: true,
      });

      await transformHelper.assertTransformIsStopped(getSLOTransformId(stoppedSloId, sloRevision));
      await transformHelper.assertTransformIsStopped(
        getSLOSummaryTransformId(stoppedSloId, sloRevision)
      );

      const results: RepairActionsGroupResult[] = await sloApi.repair(sloIds, adminRoleAuthc);

      expect(results).to.have.length(3);

      const healthySloIds = [slo1.id, slo2.id];
      for (const healthySloId of healthySloIds) {
        const healthyResult = results.find((r) => r.id === healthySloId);
        expect(healthyResult).to.be.ok();
        expect(healthyResult!.results).to.have.length(1);
        expect(healthyResult!.results[0].action.type).to.eql('noop');
        expect(healthyResult!.results[0].status).to.eql('success');
      }

      const stoppedResult = results.find((r) => r.id === stoppedSloId);
      expect(stoppedResult).to.be.ok();
      expect(stoppedResult!.results).to.have.length(2);

      const actionTypes = stoppedResult!.results.map((r) => r.action.type);
      expect(actionTypes).to.contain('start-transform');
      expect(actionTypes.filter((t) => t === 'start-transform')).to.have.length(2);

      const transformTypes = stoppedResult!.results.map((r) => r.action.transformType);
      expect(transformTypes).to.contain('rollup');
      expect(transformTypes).to.contain('summary');

      for (const result of stoppedResult!.results) {
        expect(result.status).to.eql('success');
      }

      await transformHelper.assertTransformIsStarted(getSLOTransformId(stoppedSloId, sloRevision));
      await transformHelper.assertTransformIsStarted(
        getSLOSummaryTransformId(stoppedSloId, sloRevision)
      );
    });
  });
}
