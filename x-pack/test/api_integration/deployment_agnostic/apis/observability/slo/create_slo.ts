/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { getSLOSummaryTransformId, getSLOTransformId } from '@kbn/slo-plugin/common/constants';
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

  describe('Create SLOs', function () {
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

    it('creates a new slo and transforms', async () => {
      const apiResponse = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      expect(apiResponse).property('id');
      const { id } = apiResponse;

      const definitions = await sloApi.findDefinitions(adminRoleAuthc);
      expect(definitions.total).eql(1);
      expect(definitions.results[0]).eql({
        budgetingMethod: 'occurrences',
        updatedAt: definitions.results[0].updatedAt,
        createdAt: definitions.results[0].createdAt,
        description: 'Fixture for api integration tests',
        enabled: true,
        groupBy: 'tags',
        id,
        indicator: {
          params: {
            filter: 'system.network.name: eth1',
            good: 'container.cpu.user.pct < 1',
            index: 'kbn-data-forge*',
            timestampField: '@timestamp',
            total: 'container.cpu.user.pct: *',
          },
          type: 'sli.kql.custom',
        },
        name: 'Test SLO for api integration',
        objective: {
          target: 0.99,
        },
        revision: 1,
        settings: {
          frequency: '1m',
          syncDelay: '1m',
          preventInitialBackfill: false,
        },
        tags: ['test'],
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        version: 2,
      });

      const rollUpTransformResponse = await transformHelper.assertExist(getSLOTransformId(id, 1));
      expect(rollUpTransformResponse.transforms[0].source.index).eql(['kbn-data-forge*']);
      expect(rollUpTransformResponse.transforms[0].dest).eql({
        index: '.slo-observability.sli-v3.3',
        pipeline: `.slo-observability.sli.pipeline-${id}-1`,
      });
      expect(rollUpTransformResponse.transforms[0].pivot.group_by).eql({
        'slo.groupings.tags': { terms: { field: 'tags' } },
        '@timestamp': { date_histogram: { field: '@timestamp', fixed_interval: '1m' } },
      });

      const summaryTransformResponse = await transformHelper.assertExist(
        getSLOSummaryTransformId(id, 1)
      );
      expect(summaryTransformResponse.transforms[0].source.index).eql([
        '.slo-observability.sli-v3.3*',
      ]);
      expect(summaryTransformResponse.transforms[0].dest).eql({
        index: '.slo-observability.summary-v3.3',
        pipeline: `.slo-observability.summary.pipeline-${id}-1`,
      });
    });

    describe('groupBy smoke tests', () => {
      it('creates instanceId for SLOs with multi groupBy', async () => {
        const apiResponse = await sloApi.create(
          Object.assign({}, DEFAULT_SLO, { groupBy: ['system.network.name', 'event.dataset'] }),
          adminRoleAuthc
        );

        expect(apiResponse).property('id');
        const { id } = apiResponse;

        await retry.tryForTime(180 * 1000, async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));

          // @ts-ignore
          expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql(
            'eth1,system.network'
          );
        });
      });

      it('creates instanceId for SLOs with single groupBy', async () => {
        const apiResponse = await sloApi.create(
          Object.assign({}, DEFAULT_SLO, { groupBy: 'system.network.name' }),
          adminRoleAuthc
        );

        expect(apiResponse).property('id');
        const { id } = apiResponse;

        await retry.tryForTime(180 * 1000, async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));

          // @ts-ignore
          expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('eth1');
        });
      });

      it('creates instanceId for SLOs without groupBy ([])', async () => {
        const apiResponse = await sloApi.create(
          Object.assign({}, DEFAULT_SLO, { groupBy: [] }),
          adminRoleAuthc
        );

        expect(apiResponse).property('id');
        const { id } = apiResponse;

        await retry.tryForTime(300 * 1000, async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));

          // @ts-ignore
          expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
        });
      });

      it('creates instanceId for SLOs without groupBy (["*"])', async () => {
        const apiResponse = await sloApi.create(
          Object.assign({}, DEFAULT_SLO, { groupBy: ['*'] }),
          adminRoleAuthc
        );

        expect(apiResponse).property('id');
        const { id } = apiResponse;

        await retry.tryForTime(180 * 1000, async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));

          // @ts-ignore
          expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
        });
      });

      it('creates instanceId for SLOs without groupBy ("")', async () => {
        const apiResponse = await sloApi.create(
          Object.assign({}, DEFAULT_SLO, { groupBy: '' }),
          adminRoleAuthc
        );
        expect(apiResponse).property('id');
        const { id } = apiResponse;

        await retry.tryForTime(180 * 1000, async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));

          // @ts-ignore
          expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
        });
      });
    });
  });
}

const getRollupDataEsQuery = (id: string) => ({
  index: '.slo-observability.sli-v3*',
  size: 0,
  query: {
    bool: {
      filter: [
        {
          term: {
            'slo.id': id,
          },
        },
      ],
    },
  },
  aggs: {
    last_doc: {
      top_hits: {
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        _source: {
          includes: ['slo.instanceId'],
        },
        size: 1,
      },
    },
  },
});
