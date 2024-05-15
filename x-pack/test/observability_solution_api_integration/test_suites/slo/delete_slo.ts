/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cleanup } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';

import { FtrProviderContext } from '../../ftr_provider_context';
import { sloData } from './fixtures/create_slo';
import { loadTestData } from './helper/load_test_data';

export default function ({ getService }: FtrProviderContext) {
  describe('Delete SLOs', function () {
    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const logger = getService('log');
    const sloApi = getService('sloApi');
    const retry = getService('retry');

    let createSLOInput: CreateSLOInput;

    before(async () => {
      await sloApi.deleteAllSLOs();
      await sloApi.deleteTestSourceData();
      loadTestData(getService);
    });

    beforeEach(() => {
      createSLOInput = sloData;
    });

    afterEach(async () => {
      await sloApi.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloApi.deleteTestSourceData();
    });

    it('deletes new slo saved object and transforms', async () => {
      const { id } = await sloApi.create(createSLOInput);

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      expect(savedObject.saved_objects[0].attributes.id).eql(id);

      await retry.tryForTime(300 * 1000, async () => {
        // expect summary and rollup data to exist
        const sloSummaryResponse = await sloApi.getSLOSummaryDataById(id);
        const sloRollupResponse = await sloApi.getSLORollupDataById(id);

        expect(sloSummaryResponse.hits.hits.length > 0).eql(true);
        expect(sloRollupResponse.hits.hits.length > 0).eql(true);
      });

      await supertestAPI
        .delete(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(204);

      const savedObjectAfterDelete = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      // SO should now be deleted
      expect(savedObjectAfterDelete.saved_objects.length).eql(0);

      // roll up transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      // summary transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      // expect summary and rollup documents to be deleted
      await retry.waitForWithTimeout('SLO summary data is deleted', 60 * 1000, async () => {
        const sloSummaryResponseAfterDeletion = await sloApi.getSLOSummaryDataById(id);
        if (sloSummaryResponseAfterDeletion.hits.hits.length > 0) {
          throw new Error('SLO summary data not deleted yet');
        }
        return true;
      });

      await retry.waitForWithTimeout('SLO rollup data is deleted', 60 * 1000, async () => {
        const sloRollupResponseAfterDeletion = await sloApi.getSLORollupDataById(id);
        if (sloRollupResponseAfterDeletion.hits.hits.length > 1) {
          throw new Error('SLO rollup data not deleted yet');
        }
        return true;
      });
    });
  });
}
