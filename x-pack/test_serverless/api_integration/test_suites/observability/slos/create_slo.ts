/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import type { GetTransformsResponseSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';
import { ALL_VALUE } from '@kbn/slo-schema';

import {
  getSLOSummaryPipelineId,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '@kbn/slo-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

interface ExpectedTransforms {
  count: number;
  typeOfVersion: string;
  typeOfCreateTime: string;
  results: Record<string, { id: string; destIndex: string }>;
}

function assertTransformsResponseBody(
  body: GetTransformsResponseSchema,
  expectedTransforms: ExpectedTransforms
) {
  expect(body.count).to.eql(expectedTransforms.count);
  expect(body.transforms).to.have.length(expectedTransforms.count);

  body.transforms.forEach((transform, index) => {
    const expectedTransform = expectedTransforms.results[`transform${index}`];
    expect(transform.id).to.eql(expectedTransform.id);
    expect(transform.dest.index).to.eql(expectedTransform.destIndex);
    expect(typeof transform.version).to.eql(expectedTransforms.typeOfVersion);
    expect(typeof transform.create_time).to.eql(expectedTransforms.typeOfCreateTime);
  });
}

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const dataViewApi = getService('dataViewApi');
  const sloApi = getService('sloApi');
  const kibanaServer = getService('kibanaServer');
  const transform = getService('transform');

  describe('create_slo', () => {
    // DATE_VIEW should match the index template:
    // x-pack/packages/kbn-infra-forge/src/data_sources/composable/template.json
    const DATE_VIEW = 'kbn-data-forge-fake_hosts';
    const DATA_VIEW_ID = 'data-view-id';
    let infraDataIndex: string;

    before(async () => {
      infraDataIndex = await generate({
        esClient,
        lookback: 'now-15m',
        logger,
      });
      await dataViewApi.create({
        name: DATE_VIEW,
        id: DATA_VIEW_ID,
        title: DATE_VIEW,
      });
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
      });
      await supertest
        .delete('/api/observability/slos/my-custom-id1')
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');

      await supertest
        .delete('/api/observability/slos/my-custom-id2')
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');

      await supertest
        .delete('/api/observability/slos/my-custom-id3')
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');

      await supertest
        .delete('/api/observability/slos/my-custom-id4')
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');

      await esDeleteAllIndices([infraDataIndex]);
      await cleanup({ esClient, logger });
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
      await transform.api.cleanTransformIndices();
    });

    describe('non partition by SLO', () => {
      const sloId = 'my-custom-id1';

      before(async () => {
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
      });

      it('saves the SLO definition', async () => {
        const savedObject = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObject.total).to.eql(1);
        expect(savedObject.saved_objects[0].attributes.version).eql(2);
        expect(savedObject.saved_objects[0].attributes.revision).eql(1);
      });

      it('creates the rollup and summary transforms', async () => {
        const expectedTransforms: ExpectedTransforms = {
          count: 2,
          results: {
            transform0: { id: 'slo-my-custom-id1-1', destIndex: '.slo-observability.sli-v3' },
            transform1: {
              id: 'slo-summary-my-custom-id1-1',
              destIndex: '.slo-observability.summary-v3',
            },
          },
          typeOfVersion: 'string',
          typeOfCreateTime: 'number',
        };
        const { body, status } = await supertest
          .get(`/internal/transform/transforms`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .set('elastic-api-version', '1')
          .send();
        transform.api.assertResponseStatusCode(200, status, body);
        assertTransformsResponseBody(body, expectedTransforms);
      });

      it('creates ingest pipeline', async () => {
        const sloRevision = 1;
        const pipelineResponse = await esClient.ingest.getPipeline({
          id: getSLOSummaryPipelineId(sloId, sloRevision),
        });
        const expectedPipeline = `.slo-observability.summary.pipeline-${sloId}-${sloRevision}`;

        expect(pipelineResponse[expectedPipeline]).not.to.be(undefined);
        expect(pipelineResponse[expectedPipeline].description).to.be(
          `Ingest pipeline for SLO summary data [id: ${sloId}, revision: ${sloRevision}]`
        );
      });

      it('creates summary TEMP index', async () => {
        const result = await sloApi.waitForSloSummaryTempIndexToExist(SLO_SUMMARY_TEMP_INDEX_NAME);
        expect(result).to.be(true);
      });

      it('finds the created SLO', async () => {
        const createdSlo = await sloApi.waitForSloCreated({ sloId });
        expect(createdSlo.id).to.be(sloId);
        expect(createdSlo.groupBy).to.be(ALL_VALUE);
      });
    });

    describe('SLO with long description', () => {
      it('creates an SLO with description over 256 characters', async () => {
        const sloId = 'my-custom-id2';
        await sloApi.create({
          id: sloId,
          name: 'my super long SLO name and description',
          description:
            'Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ',
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
          groupBy: '*',
        });

        const createdSlo = await sloApi.waitForSloCreated({ sloId });
        expect(createdSlo.id).to.be(sloId);
      });
    });

    describe('SLO with special characters in the description', () => {
      it("creates an SLO that has ' character in the description", async () => {
        const sloId = 'my-custom-id3';
        await sloApi.create({
          id: sloId,
          name: 'my SLO with weird characters in the description',
          description:
            "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
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
          groupBy: '*',
        });
        const createdSlo = await sloApi.waitForSloCreated({ sloId });
        expect(createdSlo.id).to.be(sloId);
      });
    });

    describe('partition by SLO', () => {
      it('creates a partition by SLO', async () => {
        const sloId = 'my-custom-id4';
        await sloApi.create({
          id: sloId,
          name: 'Group by SLO',
          description: 'This is a group by SLO.',
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
          groupBy: 'host.name',
        });
        const createdSlo = await sloApi.waitForSloCreated({ sloId });
        expect(createdSlo.id).to.be(sloId);
        expect(createdSlo.groupBy).not.to.be(ALL_VALUE);
        expect(createdSlo.groupBy).to.be('host.name');
      });
    });

    describe('Total transforms', () => {
      it('returns all the transforms for above created SLOs', async () => {
        const expectedTransforms: ExpectedTransforms = {
          count: 8,
          results: {
            transform0: { id: 'slo-my-custom-id1-1', destIndex: '.slo-observability.sli-v3.1' },
            transform1: { id: 'slo-my-custom-id2-1', destIndex: '.slo-observability.sli-v3.1' },
            transform2: { id: 'slo-my-custom-id3-1', destIndex: '.slo-observability.sli-v3.1' },
            transform3: { id: 'slo-my-custom-id4-1', destIndex: '.slo-observability.sli-v3.1' },
            transform4: {
              id: 'slo-summary-my-custom-id1-1',
              destIndex: '.slo-observability.summary-v3.1',
            },
            transform5: {
              id: 'slo-summary-my-custom-id2-1',
              destIndex: '.slo-observability.summary-v3.1',
            },
            transform6: {
              id: 'slo-summary-my-custom-id3-1',
              destIndex: '.slo-observability.summary-v3.1',
            },
            transform7: {
              id: 'slo-summary-my-custom-id4-1',
              destIndex: '.slo-observability.summary-v3.1',
            },
          },
          typeOfVersion: 'string',
          typeOfCreateTime: 'number',
        };
        const { body, status } = await supertest
          .get(`/internal/transform/transforms`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .set('elastic-api-version', '1')
          .send();
        transform.api.assertResponseStatusCode(200, status, body);
        assertTransformsResponseBody(body, expectedTransforms);
      });
    });

    describe('Total SO definitions', () => {
      it('returns SO definitions for above created SLOs', async () => {
        const savedObject = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObject.total).to.eql(4);
      });
    });
  });
}
