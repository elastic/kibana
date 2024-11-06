/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { expect as expectExpect } from 'expect';
import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import { ApiDeprecationDetails } from '@kbn/core-deprecations-common/src/types';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';
import _ from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

interface DomainApiDeprecationDetails extends ApiDeprecationDetails {
  domainId: string;
}

const getApiDeprecations = (allDeprecations: DomainDeprecationDetails[]) => {
  return allDeprecations.filter(
    (deprecation) => deprecation.deprecationType === 'api'
  ) as unknown as DomainApiDeprecationDetails[];
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const es = getService('es');

  describe('Kibana API Deprecations', () => {
    before(async () => {
      // await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.emptyKibanaIndex();
    });
    it('returns does not return api deprecations if the routes are not called', async () => {
      const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
      const apiDeprecations = getApiDeprecations(deprecations);
      expect(apiDeprecations.length).to.equal(0);
    });

    it('returns deprecated APIs when the api is called', async () => {
      await supertest.get(`/api/routing_example/d/removed_route`).expect(200);

      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(3000);
      await retry.tryForTime(
        15 * 1000,
        async () => {
          const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
          const apiDeprecations = getApiDeprecations(deprecations);
          expect(apiDeprecations.length).to.equal(1);

          expectExpect(apiDeprecations[0].correctiveActions.mark_as_resolved_api).toEqual({
            routePath: '/api/routing_example/d/removed_route',
            routeMethod: 'get',
            apiTotalCalls: 1,
            totalMarkedAsResolved: 0,
            timestamp: expectExpect.any(String),
          });

          expectExpect(apiDeprecations[0].domainId).toEqual('core.api_deprecations');
          expectExpect(apiDeprecations[0].apiId).toEqual(
            'unversioned|get|/api/routing_example/d/removed_route'
          );
          expectExpect(apiDeprecations[0].title).toEqual(
            'The "GET /api/routing_example/d/removed_route" route is removed'
          );
        },
        undefined,
        2000
      );
    });

    it('no longer returns deprecated API when it is marked as resolved', async () => {
      await supertest
        .post(`/api/deprecations/mark_as_resolved`)
        .set('kbn-xsrf', 'xxx')
        .send({
          domainId: 'core.api_deprecations',
          routePath: '/api/routing_example/d/removed_route',
          routeMethod: 'get',
          incrementBy: 1,
        })
        .expect(200);

      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(5000);
      await retry.tryForTime(15 * 1000, async () => {
        const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
        const apiDeprecations = getApiDeprecations(deprecations);
        expect(apiDeprecations.length).to.equal(0);
      });
    });

    it('returns deprecated API when it is called again after resolved, but with a different message', async () => {
      await supertest.get(`/api/routing_example/d/removed_route`).expect(200);

      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(3000);
      await retry.tryForTime(
        15 * 1000,
        async () => {
          const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
          const apiDeprecations = getApiDeprecations(deprecations);
          expect(apiDeprecations.length).to.equal(1);

          expectExpect(apiDeprecations[0].correctiveActions.mark_as_resolved_api).toEqual({
            routePath: '/api/routing_example/d/removed_route',
            routeMethod: 'get',
            apiTotalCalls: 2,
            totalMarkedAsResolved: 1,
            timestamp: expectExpect.any(String),
          });
        },
        undefined,
        2000
      );
    });

    it('keeps track of all counters via saved objects and core usage counters', async () => {
      const should = ['total', 'resolved', 'marked_as_resolved'].map((type) => ({
        match: { 'usage-counter.counterType': `deprecated_api_call:${type}` },
      }));

      const { hits } = await es.search<{ 'usage-counter': UsageCountersSavedObject }>({
        index: '.kibana_usage_counters',
        body: {
          query: { bool: { should } },
        },
      });

      expect(hits.hits.length).to.equal(3);
      const counters = hits.hits.map((hit) => hit._source!['usage-counter']).sort();
      expectExpect(_.sortBy(counters, 'counterType')).toEqual([
        {
          count: 1,
          counterName: 'unversioned|get|/api/routing_example/d/removed_route',
          counterType: 'deprecated_api_call:marked_as_resolved',
          domainId: 'core',
          source: 'server',
        },
        {
          count: 1,
          counterName: 'unversioned|get|/api/routing_example/d/removed_route',
          counterType: 'deprecated_api_call:resolved',
          domainId: 'core',
          source: 'server',
        },
        {
          count: 2,
          counterName: 'unversioned|get|/api/routing_example/d/removed_route',
          counterType: 'deprecated_api_call:total',
          domainId: 'core',
          source: 'server',
        },
      ]);
    });
  });
}
