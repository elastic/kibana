/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  MULTI_TERMS_AGGREGATE_ROUTE,
  CURRENT_API_VERSION,
  ORCHESTRATOR_NAMESPACE,
  CONTAINER_IMAGE_NAME,
  ENTRY_LEADER_ENTITY_ID,
} from '@kbn/kubernetes-security-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
const MOCK_INDEX = 'kubernetes-test-index';
const TIMESTAMP_PROPERTY = '@timestamp';

// eslint-disable-next-line import/no-default-export
export default function aggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const namespaces = new Set([
    'namespace',
    'namespace02',
    'namespace03',
    'namespace04',
    'namespace05',
    'namespace06',
    'namespace07',
    'namespace08',
    'namespace09',
    'namespace10',
  ]);

  function getRoute() {
    return supertest
      .get(MULTI_TERMS_AGGREGATE_ROUTE)
      .set('kbn-xsrf', 'foo')
      .set('Elastic-Api-Version', CURRENT_API_VERSION);
  }

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

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} returns aggregates on process events`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({ match: { [ENTRY_LEADER_ENTITY_ID]: '1' } }),
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
          },
        ]),
        page: 0,
        index: MOCK_INDEX,
        perPage: 10,
      });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(10);

      response.body.buckets.forEach((bucket: { key: [string, string] }) => {
        expect(namespaces.has(bucket.key[0])).to.be(true);
        expect(bucket.key[1]).to.be('debian11');
      });
    });

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} allows pagination`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({ match: { [ENTRY_LEADER_ENTITY_ID]: '1' } }),
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
            missing: 'default',
          },
        ]),
        page: 1,
        index: MOCK_INDEX,
        perPage: 5,
      });

      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(5);
      expect(response.body.buckets[0].key[0]).to.be('namespace06');
      expect(response.body.buckets[0].key[1]).to.be('debian11');
    });

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} allows missing field`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({ match: { [ENTRY_LEADER_ENTITY_ID]: '1' } }),
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
            missing: 'default',
          },
        ]),
        page: 2,
        index: MOCK_INDEX,
        perPage: 4,
      });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(2);
      expect(response.body.buckets[1].key[0]).to.be('namespace09');
      expect(response.body.buckets[1].key[1]).to.be('default');
    });

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} return countBy value for each aggregation`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({ match: { [ENTRY_LEADER_ENTITY_ID]: '1' } }),
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
          },
        ]),
        countBy: ORCHESTRATOR_NAMESPACE,
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

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} allows a range query`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({
          range: {
            [TIMESTAMP_PROPERTY]: {
              gte: '2020-12-16T15:16:28.570Z',
              lte: '2020-12-16T15:16:30.570Z',
            },
          },
        }),
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
          },
        ]),
        page: 0,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(200);
      expect(response.body.buckets.length).to.be(3);
    });

    it(`${MULTI_TERMS_AGGREGATE_ROUTE} handles a bad request`, async () => {
      const response = await getRoute().query({
        query: 'asdf',
        groupBys: JSON.stringify([
          {
            field: ORCHESTRATOR_NAMESPACE,
          },
          {
            field: CONTAINER_IMAGE_NAME,
          },
        ]),
        page: 0,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(500);
    });
  });
}
