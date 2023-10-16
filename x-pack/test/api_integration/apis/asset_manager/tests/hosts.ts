/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, infra } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { ASSETS_ENDPOINT } from './constants';
import { FtrProviderContext } from '../types';

const HOSTS_ASSETS_ENDPOINT = `${ASSETS_ENDPOINT}/hosts`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('infraSynthtraceEsClient');

  describe('GET /assets/hosts', () => {
    beforeEach(async () => {
      await synthtrace.clean();
    });

    it('should return hosts', async () => {
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
      await synthtrace.index(generateHostsData({ from, to, count: 5 }));

      const response = await supertest
        .get(HOSTS_ASSETS_ENDPOINT)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('hosts');
      expect(response.body.hosts.length).to.equal(5);
    });
  });
}

function generateHostsData({ from, to, count = 1 }: { from: string; to: string; count: number }) {
  const range = timerange(from, to);

  const hosts = Array(count)
    .fill(0)
    .map((_, idx) => infra.host(`my-host-${idx}`));

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => hosts.map((host) => host.metrics().timestamp(timestamp)));
}
