/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, infra } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { Asset } from '@kbn/assetManager-plugin/common/types_api';
import * as routePaths from '@kbn/assetManager-plugin/common/constants_routes';
import { FtrProviderContext } from '../types';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('infraSynthtraceEsClient');

  describe(`GET ${routePaths.GET_PODS}`, () => {
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();

    beforeEach(async () => {
      await synthtrace.clean();
    });

    it('should return pod assets', async () => {
      await synthtrace.index(generatePodsData({ from, to, count: 5 }));

      const response = await supertest
        .get(routePaths.GET_PODS)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('pods');
      expect(response.body.pods.length).to.equal(5);
    });

    it('should return a specific pod asset by EAN', async () => {
      await synthtrace.index(generatePodsData({ from, to, count: 5 }));
      const testEan = 'pod:pod-uid-1';

      const response = await supertest
        .get(routePaths.GET_PODS)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ ean: testEan }),
        })
        .expect(200);

      expect(response.body).to.have.property('pods');
      expect(response.body.pods.length).to.equal(1);
      expect(response.body.pods[0]['asset.ean']).to.equal(testEan);
    });

    it('should return a filtered list of pods assets by ID wildcard pattern', async () => {
      await synthtrace.index(generatePodsData({ from, to, count: 15 }));
      const testIdPattern = '*id-1*';

      const response = await supertest
        .get(routePaths.GET_PODS)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ id: testIdPattern }),
        })
        .expect(200);

      expect(response.body).to.have.property('pods');
      expect(response.body.pods.length).to.equal(6);

      const ids = response.body.pods.map((result: Asset) => result['asset.id']);

      expect(ids).to.eql([
        'pod-uid-1',
        'pod-uid-10',
        'pod-uid-11',
        'pod-uid-12',
        'pod-uid-13',
        'pod-uid-14',
      ]);
    });
  });
}

function generatePodsData({ from, to, count = 1 }: { from: string; to: string; count: number }) {
  const range = timerange(from, to);

  const pods = Array(count)
    .fill(0)
    .map((_, idx) => infra.pod(`pod-uid-${idx}`, `node-name-${idx}`));

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => pods.map((pod) => pod.metrics().timestamp(timestamp)));
}
