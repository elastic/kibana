/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';
import { cleanup, generate } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import { ALL_VALUE } from '@kbn/slo-schema';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  getSLOSummaryPipelineId,
} from '@kbn/slo-plugin/common/constants';
import {
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '@kbn/slo-plugin/common/constants';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const logger = getService('log');
  const kibanaServer = getService('kibanaServer');
  const sloApi = getService('sloApi');
  const transform = getService('transform');
  const retry = getService('retry');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const dataViewApi = getService('dataViewApi');
  const svlUserManager = getService('svlUserManager');

  const fetchSloSummaryPipeline = async (sloId: string, sloRevision: number) => {
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
    // DATE_VIEW should match the index template:
    // x-pack/packages/kbn-infra-forge/src/data_sources/composable/template.json
    const DATE_VIEW = 'kbn-data-forge-fake_hosts';
    const DATA_VIEW_ID = 'data-view-id';
    let infraDataIndex: string;
    let sloId: string;
    let roleAuthc: RoleCredentials;

    before(async () => {
      await sloApi.deleteAllSLOs();

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
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
      });
      await sloApi.deleteAllSLOs();
      await esDeleteAllIndices([infraDataIndex]);
      await cleanup({ esClient, logger });
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('non partition by SLO', () => {
      it('deletes the SLO definition, transforms, ingest pipeline and data', async () => {
        const createdSlo = await sloApi.create(
          {
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
        sloId = createdSlo.id;
        await sloApi.waitForSloCreated({ sloId, roleAuthc });

        // Saved Object
        const savedObject = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObject.total).to.eql(1);
        expect(savedObject.saved_objects[0].attributes.id).to.eql(sloId);
        const sloRevision = savedObject.saved_objects[0].attributes.revision ?? 1;

        // Transforms
        const sloTransformId = getSLOTransformId(sloId, sloRevision);
        const sloSummaryTransformId = getSLOSummaryTransformId(sloId, sloRevision);
        await transform.api.waitForTransformToExist(sloTransformId);
        await transform.api.waitForTransformToExist(sloSummaryTransformId);

        // Ingest pipeline
        const pipelineResponse = await fetchSloSummaryPipeline(sloId, sloRevision);
        expect(pipelineResponse[getSLOSummaryPipelineId(sloId, sloRevision)]).not.to.be(undefined);

        // RollUp and Summary data
        const sloRollupData = await sloApi.waitForSloData({
          sloId,
          indexName: SLO_DESTINATION_INDEX_PATTERN,
        });
        const sloSummaryData = await sloApi.waitForSloData({
          sloId,
          indexName: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        });

        expect(sloRollupData.hits.hits.length > 0).to.be(true);
        expect(sloSummaryData.hits.hits.length > 0).to.be(true);

        // Delete the SLO
        const response = await sloApi.waitForSloToBeDeleted({
          sloId,
          roleAuthc,
        });
        expect(response.status).to.be(204);

        // Saved object definition
        const savedObjectAfterDelete = await kibanaServer.savedObjects.find({
          type: SO_SLO_TYPE,
        });
        expect(savedObjectAfterDelete.total).to.eql(0);

        // Transforms
        await transform.api.getTransform(sloTransformId, 404);
        await transform.api.getTransform(sloSummaryTransformId, 404);

        await retry.waitForWithTimeout('SLO summary data is deleted', 60 * 1000, async () => {
          const sloSummaryDataAfterDeletion = await sloApi.getSloData({
            sloId,
            indexName: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
          });
          if (sloSummaryDataAfterDeletion.hits.hits.length > 0) {
            throw new Error('SLO summary data not deleted yet');
          }
          return true;
        });
      });
    });
  });
}
