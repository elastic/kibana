/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SO_SLO_TYPE } from '@kbn/observability-plugin/server/saved_objects';
import { cleanup, generate } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import { ALL_VALUE } from '@kbn/slo-schema';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  getSLOSummaryPipelineId,
} from '@kbn/observability-plugin/common/slo/constants';
import { ElasticsearchClient } from '@kbn/core/server';

import { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const logger = getService('log');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const sloApi = getService('sloApi');
  const transform = getService('transform');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const dataViewApi = getService('dataViewApi');

  const fetchSloSummaryPipeline = async (
    client: ElasticsearchClient,
    sloId: string,
    sloRevision: number
  ) => {
    try {
      return await esClient.ingest.getPipeline({
        id: getSLOSummaryPipelineId(sloId, sloRevision),
      });
    } catch (error) {
      // The GET /_ingest/pipeline API returns an empty object on 404 Not Found. If there are no SLO
      // pipelines then return an empty record of pipelines
      return {};
    }
  };
  describe('delete_slo', () => {
    let infraDataIndex: string;
    const sloId = 'my-custom-id1';

    before(async () => {
      infraDataIndex = await generate({
        esClient,
        lookback: 'now-15m',
        logger,
        eventsPerCycle: 4,
      });
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloApi.delete(sloId);
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
    });

    describe('non partition by SLO', () => {
      beforeEach(async () => {
        await sloApi.create({
          id: sloId,
          name: 'my custom name',
          description: 'my custom description',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: infraDataIndex,
              good: 'system.cpu.total.norm.pct > 1',
              total: 'system.cpu.total.norm.pct: *',
              timestampField: '@timestamp',
            },
          },
          timeWindow: {
            duration: '7d',
            type: 'rolling',
          },
          budgetingMethod: 'occurrences',
          objective: {
            target: 0.999,
          },
          groupBy: ALL_VALUE,
        });
        await sloApi.waitForSloCreated({ sloId });
      });

      it('deletes the SLO definition', async () => {
        const savedObject = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObject.total).to.eql(1);
        expect(savedObject.saved_objects[0].attributes.id).to.eql(sloId);
        const response = await sloApi.waitForSloToBeDeleted(sloId);
        expect(response.status).to.be(204);

        const savedObjectAfterDelete = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObjectAfterDelete.total).to.eql(0);
      });

      it('uninstalls the roll up and summary transforms', async () => {
        const sloTransformId = getSLOTransformId(sloId, 1);
        const sloSummaryTransformId = getSLOSummaryTransformId(sloId, 1);
        await transform.api.waitForTransformToExist(sloTransformId);
        await transform.api.waitForTransformToExist(sloSummaryTransformId);

        await sloApi.waitForSloToBeDeleted(sloId);
        await transform.api.getTransform(sloTransformId, 404);
        await transform.api.getTransform(sloSummaryTransformId, 404);
      });

      it('deletes the ingest pipeline', async () => {
        const sloRevision = 1;
        const pipelineResponse = await fetchSloSummaryPipeline(esClient, sloId, sloRevision);
        const expectedPipeline = `.slo-observability.summary.pipeline-${sloId}-${sloRevision}`;
        expect(pipelineResponse[expectedPipeline]).not.to.be(undefined);
        await sloApi.waitForSloToBeDeleted(sloId);
        const pipelineResponseAfterDelete = await fetchSloSummaryPipeline(
          esClient,
          sloId,
          sloRevision
        );
        expect(Object.keys(pipelineResponseAfterDelete).length).to.be(0);
      });

      it('deletes the rollup and summary data', async () => {
        const response = await sloApi.waitForSloToBeDeleted(sloId);
      });
      // TODO
      it('deletes the associated rules', async () => {});
    });
  });
}
