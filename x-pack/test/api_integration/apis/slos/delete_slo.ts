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
import { SloEsClient } from './helper/es';

export default function ({ getService }: FtrProviderContext) {
  describe('Delete SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const logger = getService('log');
    const slo = getService('slo');
    const retry = getService('retry');
    const sloEsClient = new SloEsClient(esClient);

    let createSLOInput: CreateSLOInput;

    before(async () => {
      await slo.deleteAllSLOs();
      await sloEsClient.deleteTestSourceData();
      loadTestData(getService);
    });

    beforeEach(() => {
      createSLOInput = sloData;
    });

    afterEach(async () => {
      await slo.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloEsClient.deleteTestSourceData();
    });

    it('deletes new slo saved object and transforms', async () => {
      const id = await slo.create(createSLOInput);

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      expect(savedObject.saved_objects[0].attributes.id).eql(id);

      await retry.tryForTime(300 * 1000, async () => {
        // expect summary and rollup data to exist
        const sloSummaryResponse = await sloEsClient.getSLOSummaryDataById(id);
        const sloRollupResponse = await sloEsClient.getSLORollupDataById(id);

        expect(sloSummaryResponse.hits.hits.length > 0).eql(true);
        expect(sloRollupResponse.hits.hits.length > 0).eql(true);

        const rollUpTransformResponse = await supertestAPI
          .get(`/internal/transform/transforms/slo-${id}-1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send()
          .expect(200);

        // expect roll up transform to be created
        expect(rollUpTransformResponse.body.transforms[0].id).eql(`slo-${id}-1`);

        const summaryTransform = await supertestAPI
          .get(`/internal/transform/transforms/slo-summary-${id}-1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send()
          .expect(200);

        // expect summary transform to be created
        expect(summaryTransform.body.transforms[0].id).eql(`slo-summary-${id}-1`);

        await supertestAPI
          .delete(`/api/observability/slos/${id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);
      });

      //   await retry.tryForTime(150 * 1000, async () => {
      const savedObjectAfterDelete = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      // SO should now be deleted
      expect(savedObjectAfterDelete.saved_objects.length).eql(0);

      // roll up transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      // summary transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      // expect summary and rollup documents to be deleted
      await retry.tryForTime(60 * 1000, async () => {
        const sloSummaryResponseAfterDeletion = await sloEsClient.getSLOSummaryDataById(id);
        const sloRollupResponseAfterDeletion = await sloEsClient.getSLORollupDataById(id);
        expect(sloSummaryResponseAfterDeletion.hits.hits.length).eql(0);
        // sometimes the ingest pipeline ingests one extra document after the transform is stopped
        expect(sloRollupResponseAfterDeletion.hits.hits.length <= 1).eql(true);
      });
    });
  });
}
