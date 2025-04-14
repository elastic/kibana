/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SLI_DESTINATION_INDEX_PATTERN } from '@kbn/slo-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;

  describe('Purge SLI data', function () {
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
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('should accept a valid purge policy - duration', async () => {
      const response = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(response).property('id');
      const id = response.id;

      await sloApi.purgeRollupData(
        [id],
        { purgeType: 'fixed_age', age: '7d' },
        adminRoleAuthc,
        204
      );

      // expect rollup documents to be deleted

      await retry.waitForWithTimeout('SLO rollup data is deleted', 60 * 1000, async () => {
        const sloRollupResponseAfterDeletion = await esClient.search({
          index: SLI_DESTINATION_INDEX_PATTERN,
          query: {
            bool: {
              filter: [
                {
                  term: { 'slo.id': id },
                },
              ],
            },
          },
        });
        if (sloRollupResponseAfterDeletion.hits.hits.length > 1) {
          throw new Error('SLO rollup data not deleted yet');
        }
        return true;
      });
    });

    it('should accept a valid purge policy - timestamp', async () => {
      const response = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(response).property('id');
      const id = response.id;

      await sloApi.purgeRollupData(
        [id],
        { purgeType: 'fixed_time', timestamp: new Date('2025-01-01T00:00:00Z').toISOString() },
        adminRoleAuthc,
        204
      );

      // expect rollup documents to be deleted

      await retry.waitForWithTimeout('SLO rollup data is deleted', 60 * 1000, async () => {
        const sloRollupResponseAfterDeletion = await esClient.search({
          index: SLI_DESTINATION_INDEX_PATTERN,
          query: {
            bool: {
              filter: [
                {
                  term: { 'slo.id': id },
                },
              ],
            },
          },
        });
        if (sloRollupResponseAfterDeletion.hits.hits.length > 1) {
          throw new Error('SLO rollup data not deleted yet');
        }
        return true;
      });
    });

    it('should reject an invalid purge policy - duration', async () => {
      const response = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(response).property('id');
      const id = response.id;

      await sloApi.purgeRollupData(
        [id],
        { purgeType: 'fixed_age', age: '3d' },
        adminRoleAuthc,
        400
      );

      // expect rollup documents to be deleted
    });

    it('should reject an invalid purge policy - timestamp', async () => {
      const response = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(response).property('id');
      const id = response.id;

      await sloApi.purgeRollupData(
        [id],
        { purgeType: 'fixed_time', timestamp: new Date().toISOString() },
        adminRoleAuthc,
        400
      );

      // expect rollup documents to be deleted
    });
  });
}
