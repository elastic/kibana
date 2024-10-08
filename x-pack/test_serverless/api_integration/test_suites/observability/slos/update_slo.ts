/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanup, generate } from '@kbn/infra-forge';
import { getSLOPipelineId, getSLOSummaryPipelineId } from '@kbn/slo-plugin/common/constants';
import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const dataViewApi = getService('dataViewApi');
  const sloApi = getService('sloApi');
  const kibanaServer = getService('kibanaServer');
  const transform = getService('transform');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('update_slo', () => {
    // DATE_VIEW should match the index template:
    // x-pack/packages/kbn-infra-forge/src/data_sources/composable/template.json
    const DATE_VIEW = 'kbn-data-forge-fake_hosts';
    const DATA_VIEW_ID = 'data-view-id';
    let infraDataIndex: string;
    let roleAuthc: RoleCredentials;

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
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
      });
      await supertest
        .delete('/api/observability/slos/my-custom-id1')
        .set(svlCommonApi.getInternalRequestHeader());

      await supertest
        .delete('/api/observability/slos/my-custom-id2')
        .set(svlCommonApi.getInternalRequestHeader());

      await esDeleteAllIndices([infraDataIndex]);
      await cleanup({ esClient, logger });
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
      await transform.api.cleanTransformIndices();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('when updating fields without revision bump', () => {
      const sloId = 'my-custom-id1';

      before(async () => {
        await sloApi.create(
          {
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
          },
          roleAuthc
        );
      });

      it('updates the SO definition', async () => {
        let sloResponse = await sloApi.waitForSloCreated({ sloId, roleAuthc });
        expect(sloResponse.name).to.eql('my custom name');
        expect(sloResponse.description).to.eql('my custom description');
        expect(sloResponse.revision).to.eql(1);

        await sloApi.update(
          {
            sloId,
            slo: {
              name: 'updated name',
              description: 'updated description',
            },
          },
          roleAuthc
        );

        // assert definition is updated
        sloResponse = await sloApi.waitForSloCreated({ sloId, roleAuthc });
        expect(sloResponse.name).to.eql('updated name');
        expect(sloResponse.description).to.eql('updated description');
        expect(sloResponse.revision).to.eql(1);

        // assert resources are not reinstalled
        const expectedRevision = 1;
        const rollupPipelineResponse = await esClient.ingest.getPipeline({
          id: getSLOPipelineId(sloId, expectedRevision),
        });
        const expectedRollupPipeline = `.slo-observability.sli.pipeline-${sloId}-${expectedRevision}`;
        expect(rollupPipelineResponse[expectedRollupPipeline]).not.to.be(undefined);

        const summaryPipelineResponse = await esClient.ingest.getPipeline({
          id: getSLOSummaryPipelineId(sloId, expectedRevision),
        });
        const expectedSummaryPipeline = `.slo-observability.summary.pipeline-${sloId}-${expectedRevision}`;
        expect(summaryPipelineResponse[expectedSummaryPipeline]).not.to.be(undefined);

        const sloTransformId = `slo-${sloId}-${expectedRevision}`;
        await transform.api.getTransform(sloTransformId, 200);
        const sloSummaryTransformId = `slo-summary-${sloId}-${expectedRevision}`;
        await transform.api.getTransform(sloSummaryTransformId, 200);
      });
    });

    describe('when updating fields with revision bump', () => {
      const sloId = 'my-custom-id2';

      before(async () => {
        await sloApi.create(
          {
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
              target: 0.95,
            },
            groupBy: ALL_VALUE,
          },
          roleAuthc
        );
      });

      it('updates the SO definition and reinstall the resources', async () => {
        let sloResponse = await sloApi.waitForSloCreated({ sloId, roleAuthc });
        expect(sloResponse.objective).to.eql({ target: 0.95 });
        expect(sloResponse.revision).to.eql(1);

        await sloApi.update(
          {
            sloId,
            slo: {
              objective: {
                target: 0.8,
              },
            },
          },
          roleAuthc
        );

        // assert definition is updated
        sloResponse = await sloApi.waitForSloCreated({ sloId, roleAuthc });
        expect(sloResponse.objective).to.eql({ target: 0.8 });
        expect(sloResponse.revision).to.eql(2);

        // assert resources are reinstalled
        const expectedRevision = 2;
        const rollupPipelineResponse = await esClient.ingest.getPipeline({
          id: getSLOPipelineId(sloId, expectedRevision),
        });
        const expectedRollupPipeline = `.slo-observability.sli.pipeline-${sloId}-${expectedRevision}`;
        expect(rollupPipelineResponse[expectedRollupPipeline]).not.to.be(undefined);

        const summaryPipelineResponse = await esClient.ingest.getPipeline({
          id: getSLOSummaryPipelineId(sloId, expectedRevision),
        });
        const expectedSummaryPipeline = `.slo-observability.summary.pipeline-${sloId}-${expectedRevision}`;
        expect(summaryPipelineResponse[expectedSummaryPipeline]).not.to.be(undefined);

        const sloTransformId = `slo-${sloId}-${expectedRevision}`;
        await transform.api.getTransform(sloTransformId, 200);
        const sloSummaryTransformId = `slo-summary-${sloId}-${expectedRevision}`;
        await transform.api.getTransform(sloSummaryTransformId, 200);
      });
    });
  });
}
