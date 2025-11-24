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
      if (adminRoleAuthc) {
        try {
          await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
        } catch (err) {
          // Ignore errors if data view doesn't exist
        }
        try {
          await sloApi.deleteAllSLOs(adminRoleAuthc);
        } catch (err) {
          // Ignore errors during cleanup
        }
        try {
          await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
    });

    it('repairs missing rollup transform by recreating it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Verify transforms exist initially
      await retry.tryForTime(60 * 1000, async () => {
        const rollupTransform = await transformHelper.assertExist(
          getSLOTransformId(sloId, sloRevision)
        );
        expect(rollupTransform.transforms).to.have.length(1);
        return true;
      });

      // Delete the rollup transform to simulate it being missing
      await retry.tryForTime(60 * 1000, async () => {
        await esClient.transform.stopTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
          wait_for_completion: true,
        });
        return true;
      });
      await retry.tryForTime(60 * 1000, async () => {
        await esClient.transform.deleteTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        return true;
      });

      // Verify transform is deleted
      await retry.tryForTime(60 * 1000, async () => {
        try {
          await esClient.transform.getTransform({
            transform_id: getSLOTransformId(sloId, sloRevision),
          });
          throw new Error('Transform should not exist');
        } catch (err: any) {
          if (err.statusCode === 404) {
            return true;
          }
          throw err;
        }
      });

      // Repair the SLO
      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the rollup transform is recreated
      await retry.tryForTime(60 * 1000, async () => {
        // First verify it exists
        await transformHelper.assertExist(getSLOTransformId(sloId, sloRevision));
        // Then check its state using getTransformStats
        const rollupTransform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(rollupTransform.transforms).to.have.length(1);
        expect(rollupTransform.transforms[0].state).to.eql('started');
        return true;
      });
    });

    it('repairs missing summary transform by recreating it', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Verify summary transform exists initially
      await retry.tryForTime(60 * 1000, async () => {
        const summaryTransform = await transformHelper.assertExist(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
        expect(summaryTransform.transforms).to.have.length(1);
        return true;
      });

      // Delete the summary transform to simulate it being missing
      await retry.tryForTime(60 * 1000, async () => {
        await esClient.transform.stopTransform({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
          wait_for_completion: true,
        });
        return true;
      });

      await retry.tryForTime(60 * 1000, async () => {
        await esClient.transform.deleteTransform({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
        });
        return true;
      });

      // Verify transform is deleted
      await retry.tryForTime(60 * 1000, async () => {
        try {
          await esClient.transform.getTransform({
            transform_id: getSLOSummaryTransformId(sloId, sloRevision),
          });
          throw new Error('Transform should not exist');
        } catch (err: any) {
          if (err.statusCode === 404) {
            return true;
          }
          throw err;
        }
      });

      // Repair the SLO
      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the summary transform is recreated
      await retry.tryForTime(60 * 1000, async () => {
        // First verify it exists
        await transformHelper.assertExist(getSLOSummaryTransformId(sloId, sloRevision));
        // Then check its state using getTransformStats
        const summaryTransform = await esClient.transform.getTransformStats({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
        });
        expect(summaryTransform.transforms).to.have.length(1);
        expect(summaryTransform.transforms[0].state).to.eql('started');
        return true;
      });
    });

    it('repairs stopped transform by starting it when SLO is enabled', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Stop the rollup transform
      await retry.tryForTime(60 * 1000, async () => {
        await esClient.transform.stopTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
          wait_for_completion: true,
        });
        return true;
      });

      // Verify transform is stopped
      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('stopped');
        return true;
      });

      // Repair the SLO
      await sloApi.repair([sloId], adminRoleAuthc);

      // Verify the transform is started
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

      // Verify transform is started
      await retry.tryForTime(60 * 1000, async () => {
        const transform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        expect(transform.transforms[0].state).to.eql('started');
        return true;
      });

      // Repair the SLO with sloEnabled: false (simulating that the SLO should be disabled)
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

    it('handles repair when no actions are needed', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloRevision = 1;

      // Verify transforms are healthy
      await retry.tryForTime(60 * 1000, async () => {
        const rollupTransform = await esClient.transform.getTransformStats({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });
        const summaryTransform = await esClient.transform.getTransformStats({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
        });
        expect(rollupTransform.transforms[0].state).to.eql('started');
        expect(summaryTransform.transforms[0].state).to.eql('started');
        return true;
      });

      // Repair the SLO (should complete quickly since no actions needed)
      await sloApi.repair([sloId], adminRoleAuthc);
    });
  });
}
