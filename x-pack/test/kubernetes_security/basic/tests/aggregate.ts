/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGGREGATE_ROUTE } from '@kbn/kubernetes-security-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
const MOCK_INDEX = 'kubernetes-test-index';
const ORCHESTRATOR_NAMESPACE_PROPERTY = 'orchestrator.namespace';
const CONTAINER_IMAGE_NAME_PROPERTY = 'container.image.name';
const ENTRY_LEADER_ENTITY_ID = 'process.entry_leader.entity_id';
const TIMESTAMP_PROPERTY = '@timestamp';

// eslint-disable-next-line import/no-default-export
export default function aggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const namespaces = ['namespace', 'namespace02', 'namespace03', 'namespace04'];

  describe('Kubernetes security with a basic license', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/kubernetes_security/process_events'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/kubernetes_security/process_events'
      );
    });

    it(`${AGGREGATE_ROUTE} returns aggregates on process events`, async () => {
      const response = await supertest
        .get(AGGREGATE_ROUTE)
        .set('kbn-xsrf', 'foo')
        .query({
          query: JSON.stringify({ match: { [CONTAINER_IMAGE_NAME_PROPERTY]: 'debian11' } }),
          groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          page: 0,
          index: MOCK_INDEX,
          perPage: 10,
        });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(10);

      namespaces.forEach((namespace, i) => {
        expect(response.body.buckets[i].key).to.be(namespace);
      });
    });

    it(`${AGGREGATE_ROUTE} allows pagination`, async () => {
      const response = await supertest
        .get(AGGREGATE_ROUTE)
        .set('kbn-xsrf', 'foo')
        .query({
          query: JSON.stringify({ match: { [CONTAINER_IMAGE_NAME_PROPERTY]: 'debian11' } }),
          groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          page: 1,
          index: MOCK_INDEX,
        });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(1);
      expect(response.body.buckets[0].key).to.be('namespace11');
    });

    it(`${AGGREGATE_ROUTE} return countBy value for each aggregation`, async () => {
      const response = await supertest
        .get(AGGREGATE_ROUTE)
        .set('kbn-xsrf', 'foo')
        .query({
          query: JSON.stringify({ match: { [CONTAINER_IMAGE_NAME_PROPERTY]: 'debian11' } }),
          groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          countBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          page: 0,
          index: MOCK_INDEX,
        });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(10);

      // when groupBy and countBy use the same field, count_by_aggs.value will always be 1
      response.body.buckets.forEach((agg: any) => {
        expect(agg.count_by_aggs.value).to.be(1);
      });
    });

    it(`${AGGREGATE_ROUTE} return sorted aggregation by countBy field if sortByCount is true`, async () => {
      const response = await supertest
        .get(AGGREGATE_ROUTE)
        .set('kbn-xsrf', 'foo')
        .query({
          query: JSON.stringify({ match: { [CONTAINER_IMAGE_NAME_PROPERTY]: 'debian11' } }),
          groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          countBy: ENTRY_LEADER_ENTITY_ID,
          page: 0,
          index: MOCK_INDEX,
          sortByCount: 'desc',
        });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(10);
      expect(response.body.buckets[0].count_by_aggs.value).to.be(2);
      expect(response.body.buckets[1].count_by_aggs.value).to.be(1);
    });

    it(`${AGGREGATE_ROUTE} allows a range query`, async () => {
      const response = await supertest
        .get(AGGREGATE_ROUTE)
        .set('kbn-xsrf', 'foo')
        .query({
          query: JSON.stringify({
            range: {
              [TIMESTAMP_PROPERTY]: {
                gte: '2020-12-16T15:16:28.570Z',
                lte: '2020-12-16T15:16:30.570Z',
              },
            },
          }),
          groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
          page: 0,
          index: MOCK_INDEX,
        });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(3);
    });

    it(`${AGGREGATE_ROUTE} handles a bad request`, async () => {
      const response = await supertest.get(AGGREGATE_ROUTE).set('kbn-xsrf', 'foo').query({
        query: 'asdf',
        groupBy: ORCHESTRATOR_NAMESPACE_PROPERTY,
        page: 0,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(400);
    });
  });
}
