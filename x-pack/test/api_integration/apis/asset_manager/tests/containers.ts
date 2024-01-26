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

  describe(`GET ${routePaths.GET_CONTAINERS}`, () => {
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();

    beforeEach(async () => {
      await synthtrace.clean();
    });

    it('should return container assets', async () => {
      await synthtrace.index(generateContainersData({ from, to, count: 5 }));

      const response = await supertest
        .get(routePaths.GET_CONTAINERS)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('containers');
      expect(response.body.containers.length).to.equal(5);
    });

    it('should return a specific container asset by EAN', async () => {
      await synthtrace.index(generateContainersData({ from, to, count: 5 }));
      const testEan = 'container:container-id-1';

      const response = await supertest
        .get(routePaths.GET_CONTAINERS)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ ean: testEan }),
        })
        .expect(200);

      expect(response.body).to.have.property('containers');
      expect(response.body.containers.length).to.equal(1);
      expect(response.body.containers[0]['asset.ean']).to.equal(testEan);
    });

    it('should return a filtered list of container assets by ID wildcard pattern', async () => {
      await synthtrace.index(generateContainersData({ from, to, count: 15 }));
      const testIdPattern = '*id-1*';

      const response = await supertest
        .get(routePaths.GET_CONTAINERS)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ id: testIdPattern }),
        })
        .expect(200);

      expect(response.body).to.have.property('containers');
      expect(response.body.containers.length).to.equal(6);

      const ids = response.body.containers.map((result: Asset) => result['asset.id']);

      expect(ids).to.eql([
        'container-id-1',
        'container-id-10',
        'container-id-11',
        'container-id-12',
        'container-id-13',
        'container-id-14',
      ]);
    });
  });
}

function generateContainersData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const containers = Array(count)
    .fill(0)
    .map((_, idx) =>
      infra.container(`container-id-${idx}`, `container-uid-${idx + 1000}`, `node-name-${idx}`)
    );

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      containers.map((container) => container.metrics().timestamp(timestamp))
    );
}
