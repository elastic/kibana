/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import request from 'superagent';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import type { FtrProviderContext } from '../../ftr_provider_context';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('bsearch', () => {
    describe('ES|QL', () => {
      it(`should return getColumns response in expected shape`, async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set('kbn-xsrf', 'kibana')
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    query: 'from logstash-* | keep geo.coordinates | limit 0',
                  },
                },
                options: {
                  strategy: 'esql',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp);
        expect(resp.status).to.be(200);
        expect(jsonBody[0].result.rawResponse).to.eql({
          columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
          ],
          values: [],
        });
      });

      it(`should return getValues response in expected shape`, async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set('kbn-xsrf', 'kibana')
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    dropNullColumns: true,
                    query:
                      'from logstash-* | keep geo.coordinates, @timestamp | sort @timestamp | limit 1',
                  },
                },
                options: {
                  strategy: 'esql',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp);
        expect(resp.status).to.be(200);
        expect(jsonBody[0].result.rawResponse).to.eql({
          all_columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
            {
              name: '@timestamp',
              type: 'date',
            },
          ],
          columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
            {
              name: '@timestamp',
              type: 'date',
            },
          ],
          values: [['POINT (-120.9871642 38.68407028)', '2015-09-20T00:00:00.000Z']],
        });
      });
    });
  });
}
