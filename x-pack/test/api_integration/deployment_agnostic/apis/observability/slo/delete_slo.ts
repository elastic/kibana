/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '@kbn/slo-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';
import { TransformHelper, createTransformHelper } from './helpers/transform';

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
  let transformHelper: TransformHelper;

  describe('Delete SLOs', function () {
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

    it('deletes SLO and related resources', async () => {
      const response = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(response).property('id');
      const id = response.id;

      await sloApi.delete(id, adminRoleAuthc);

      // Expect no definitions exists
      const definitions = await sloApi.findDefinitions(adminRoleAuthc);
      expect(definitions.total).eql(0);

      await transformHelper.assertNotFound(getSLOTransformId(id, 1));
      await transformHelper.assertNotFound(getSLOSummaryTransformId(id, 1));
      // expect summary and rollup documents to be deleted
      await retry.waitForWithTimeout('SLO summary data is deleted', 60 * 1000, async () => {
        const sloSummaryResponseAfterDeletion = await esClient.search({
          index: SUMMARY_DESTINATION_INDEX_PATTERN,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    term: { 'slo.id': id },
                  },
                  {
                    term: { isTempDoc: false },
                  },
                ],
              },
            },
          },
        });
        if (sloSummaryResponseAfterDeletion.hits.hits.length > 0) {
          throw new Error('SLO summary data not deleted yet');
        }
        return true;
      });

      await retry.waitForWithTimeout('SLO rollup data is deleted', 60 * 1000, async () => {
        const sloRollupResponseAfterDeletion = await esClient.search({
          index: SLI_DESTINATION_INDEX_PATTERN,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    term: { 'slo.id': id },
                  },
                ],
              },
            },
          },
        });
        if (sloRollupResponseAfterDeletion.hits.hits.length > 1) {
          throw new Error('SLO rollup data not deleted yet');
        }
        return true;
      });
    });
  });
}
