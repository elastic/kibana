/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import type { WriteSamplesPostBody } from '@kbn/assetManager-plugin/server';
import { apm, infra, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { SuperTest, Test } from 'supertest';

const SAMPLE_ASSETS_ENDPOINT = '/api/asset-manager/assets/sample';

export type KibanaSupertest = SuperTest<Test>;

// NOTE: In almost every case in tests, you want { refresh: true }
// in the options of this function, so it is defaulted to that value.
// Otherwise, it's likely whatever action you are testing after you
// create the sample asset docs will fail to find them.
// This refresh key passes through to the underlying ES
// query via the refresh option, see: https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-refresh.html
export async function createSampleAssets(
  supertest: KibanaSupertest,
  options: WriteSamplesPostBody = {}
) {
  if (options === null) {
    options = {};
  }
  if (!('refresh' in options)) {
    options.refresh = true;
  }
  return supertest.post(SAMPLE_ASSETS_ENDPOINT).set('kbn-xsrf', 'xxx').send(options).expect(200);
}

export async function deleteSampleAssets(supertest: KibanaSupertest) {
  return await supertest.delete(SAMPLE_ASSETS_ENDPOINT).set('kbn-xsrf', 'xxx').expect(200);
}

export async function viewSampleAssetDocs(supertest: KibanaSupertest) {
  const response = await supertest.get(SAMPLE_ASSETS_ENDPOINT).expect(200);
  expect(response).to.have.property('body');
  expect(response.body).to.have.property('results');
  return response.body.results as AssetWithoutTimestamp[];
}

export function generateServicesData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const services = Array(count)
    .fill(0)
    .map((_, idx) =>
      apm
        .service({
          name: `service-${idx}`,
          environment: 'production',
          agentName: 'nodejs',
        })
        .instance(`my-host-${idx}`)
    );

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}

export function generateHostsData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const hosts = Array(count)
    .fill(0)
    .map((_, idx) => infra.host(`my-host-${idx}`));

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => hosts.map((host) => host.cpu().timestamp(timestamp)));
}
