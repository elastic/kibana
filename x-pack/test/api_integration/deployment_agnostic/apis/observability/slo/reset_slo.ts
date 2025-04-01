/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SLO_MODEL_VERSION, getSLOPipelineId } from '@kbn/slo-plugin/common/constants';
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

  describe('Reset SLOs', function () {
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

    it('resets the related resources', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(createResponse).property('id');
      const sloId = createResponse.id;
      const sloPipelineId = getSLOPipelineId(sloId, 1);

      // Delete the slo rollup ingest pipeline
      await retry.tryForTime(60 * 1000, async () => {
        await esClient.ingest.deletePipeline({ id: sloPipelineId });
        return true;
      });

      // reset
      const resetResponse = await sloApi.reset(sloId, adminRoleAuthc);
      expect(resetResponse).property('version', SLO_MODEL_VERSION);
      expect(resetResponse).property('revision', 1);

      // assert the pipeline is re-created
      await retry.tryForTime(60 * 1000, async () => {
        const response = await esClient.ingest.getPipeline({ id: sloPipelineId });
        return !!response[sloPipelineId];
      });
    });
  });
}
