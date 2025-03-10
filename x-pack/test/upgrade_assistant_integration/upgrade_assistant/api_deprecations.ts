/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { expect as expectExpect } from 'expect';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';
import _ from 'lodash';
import type {
  ApiDeprecationDetails,
  DomainDeprecationDetails,
} from '@kbn/core-deprecations-common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const getApiDeprecations = (allDeprecations: DomainDeprecationDetails[]) => {
  return (
    allDeprecations
      .filter(
        (deprecation): deprecation is DomainDeprecationDetails<ApiDeprecationDetails> =>
          deprecation.deprecationType === 'api'
      )
      // Ensure consistent sorting
      .sort((a, b) => a.title.localeCompare(b.title))
  );
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const es = getService('es');

  describe('Kibana API Deprecations', function () {
    // bail on first error in this suite since cases sequentially depend on each other
    this.bail(true);

    before(async () => {
      // await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.emptyKibanaIndex();
    });
    it('does not return api deprecations if deprecated routes are not called', async () => {
      const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
      const apiDeprecations = getApiDeprecations(deprecations);
      expect(apiDeprecations.length).to.equal(0);
    });

    it('returns deprecated APIs when a deprecated api is called', async () => {
      await supertest
        .get(`/internal/routing_example/d/internal_versioned_route?apiVersion=1`)
        .expect(200);
      await supertest.get(`/api/routing_example/d/removed_route`).expect(200);

      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(3000);
      await retry.tryForTime(
        15 * 1000,
        async () => {
          const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
          const apiDeprecations = getApiDeprecations(deprecations);
          expect(apiDeprecations.length).to.equal(2);

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

          expectExpect(apiDeprecations[1].correctiveActions.mark_as_resolved_api).toEqual({
            routePath: '/internal/routing_example/d/internal_versioned_route',
            routeMethod: 'get',
            routeVersion: '1',
            apiTotalCalls: 1,
            totalMarkedAsResolved: 0,
            timestamp: expectExpect.any(String),
          });

          expectExpect(apiDeprecations[1].domainId).toEqual('core.api_deprecations');
          expectExpect(apiDeprecations[1].apiId).toEqual(
            '1|get|/internal/routing_example/d/internal_versioned_route'
          );
          expectExpect(apiDeprecations[1].title).toEqual(
            'The "GET /internal/routing_example/d/internal_versioned_route" API is internal to Elastic'
          );
        },
        undefined,
        2000
      );
    });

    it('no longer returns deprecated API when it is marked as resolved', async () => {
      await supertest
        .post(`/api/deprecations/mark_as_resolved?elasticInternalOrigin=true`)
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
        expect(apiDeprecations.length).to.equal(1);
        expectExpect(apiDeprecations[0].apiId).toEqual(
          '1|get|/internal/routing_example/d/internal_versioned_route'
        );
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
          expect(apiDeprecations.length).to.equal(2);

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

      expect(hits.hits.length).to.equal(4);
      const counters = hits.hits.map((hit) => hit._source!['usage-counter']).sort();
      expectExpect(_.sortBy(counters, 'counterType')).toEqual(expectedSuiteUsageCounters);
    });

    it('Does not increment internal origin calls', async () => {
      await supertest
        .get(`/api/routing_example/d/removed_route?elasticInternalOrigin=true`)
        .expect(200);
      // call another deprecated api to make sure that we are not verifying stale results
      await supertest
        .get(`/api/routing_example/d/versioned_route?apiVersion=2023-10-31`)
        .expect(200);

      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(3000);
      await retry.tryForTime(15 * 1000, async () => {
        const should = ['total', 'resolved', 'marked_as_resolved'].map((type) => ({
          match: { 'usage-counter.counterType': `deprecated_api_call:${type}` },
        }));

        const { hits } = await es.search<{ 'usage-counter': UsageCountersSavedObject }>({
          index: '.kibana_usage_counters',
          body: {
            query: { bool: { should } },
          },
        });

        expect(hits.hits.length).to.equal(5);
        const counters = hits.hits.map((hit) => hit._source!['usage-counter']).sort();
        expectExpect(_.sortBy(counters, 'counterType')).toEqual(
          [
            ...expectedSuiteUsageCounters,
            {
              domainId: 'core',
              counterName: '2023-10-31|get|/api/routing_example/d/versioned_route',
              counterType: 'deprecated_api_call:total',
              source: 'server',
              count: 1,
            },
          ].sort()
        );
      });
    });
    it('GET /api/upgrade_assistant/status does not return { readyForUpgrade: false } if there are only critical API deprecations', async () => {
      /** Throw in another critical deprecation... */
      await supertest.get(`/api/routing_example/d/removed_route`).expect(200);
      // sleep a little until the usage counter is synced into ES
      await setTimeoutAsync(3000);
      await retry.tryForTime(
        15 * 1000,
        async () => {
          const { deprecations } = (await supertest.get(`/api/deprecations/`).expect(200)).body;
          const apiDeprecations = getApiDeprecations(deprecations);
          // confirm there is at least one CRITICAL deprecated API usage present
          expect(apiDeprecations.some(({ level }) => level === 'critical')).to.be(true);
        },
        undefined,
        2000
      );
      const { body } = await supertest.get(`/api/upgrade_assistant/status`).expect(200);
      expect(body.readyForUpgrade).to.be(true);
    });
  });
}

const expectedSuiteUsageCounters = [
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:marked_as_resolved',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:resolved',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: '1|get|/internal/routing_example/d/internal_versioned_route',
    counterType: 'deprecated_api_call:total',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:total',
    source: 'server',
    count: 2,
  },
];
