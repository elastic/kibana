/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../configs/ftr_provider_context';
import { targetTags } from '../../target_tags';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const retry = getService('retry');
  const endpointTestResources = getService('endpointTestResources');
  const esClient: Client = getService('es');

  const transformAggregation = () => ({
    init_script: 'state.docs = []',
    map_script: "state.docs.add(new HashMap(params['_source']))",
    combine_script: 'return state.docs',
    reduce_script:
      "def ret = new HashMap(); for (s in states) { for (d in s) { if (d.containsKey('Endpoint')) { ret.endpoint = d } else { ret.agent = d } }} return ret",
  });

  describe('endpoint transforms', function () {
    targetTags(this, ['@ess', '@serverless', '@serverlessQA', 'esGate']);

    describe('united transform', () => {
      const transformName = 'test-agg-united';
      const indexA = 'test-agg-index-a';
      const indexB = 'test-agg-index-b';
      const transformDest = 'test-agg-destination';

      before(async () => {
        await esClient.indices.create({
          index: indexA,
          wait_for_active_shards: 1,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              uuid: { type: 'keyword' },
              Endpoint: { type: 'keyword' },
              a_value: { type: 'keyword' },
            },
          },
        });
        await esClient.indices.create({
          index: indexB,
          wait_for_active_shards: 1,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              uuid: { type: 'keyword' },
              agent: { type: 'keyword' },
              b_value: { type: 'keyword' },
            },
          },
        });
        await esClient.transform.putTransform({
          transform_id: transformName,
          dest: {
            index: transformDest,
          },
          source: {
            index: [indexA, indexB],
          },
          frequency: '1s',
          sync: {
            time: {
              delay: '3s',
              field: '@timestamp',
            },
          },
          pivot: {
            aggs: {
              join: {
                scripted_metric: transformAggregation(),
              },
            },
            group_by: {
              uuid: {
                terms: {
                  field: 'uuid',
                },
              },
            },
          },
        });
      });
      after(async () => {
        await endpointTestResources.stopTransform(transformName);
        await esClient.transform.deleteTransform({
          transform_id: transformName,
          force: true,
          delete_dest_index: true,
        });
        await esClient.indices.delete({ index: indexA });
        await esClient.indices.delete({ index: indexB });
      });

      it('runs scripted metric agg to join data', async () => {
        await esClient.index({
          index: indexA,
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().getTime(),
            uuid: '8000',
            Endpoint: 'e', // Endpoint key must be present. value does not matter
            a_value: 'A', // key to test for
          },
        });
        await esClient.index({
          index: indexB,
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().getTime(),
            uuid: '8000',
            agent: 'a', // agent key must be present
            b_value: 'B', // key to test for
          },
        });
        await endpointTestResources.startTransform(transformName);

        await retry.waitForWithTimeout('transform to run', 10000, async () => {
          const search = await esClient.search({
            index: transformDest,
            query: {
              match_all: {},
            },
            rest_total_hits_as_int: true,
          });
          expect(search.hits.total).to.be(1);
          const result = search.hits.hits[0]._source as any;
          expect(result).to.have.key('join');
          expect(result.join).to.have.key('endpoint');
          expect(result.join).to.have.key('agent');
          expect(result.join.endpoint.a_value).to.be('A');
          expect(result.join.agent.b_value).to.be('B');
          return true;
        });
      });
    });
  });
};
