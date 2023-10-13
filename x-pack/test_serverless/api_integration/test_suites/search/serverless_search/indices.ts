/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/serverless_search';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('Indices routes', function () {
    describe('GET indices', function () {
      it('has route', async () => {
        const { body } = await supertest
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200);

        expect(body).toBeDefined();
      });
      it('accepts search_query', async () => {
        await supertest
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .query({ search_query: 'foo' })
          .expect(200);
      });
      it('accepts from & size', async () => {
        await supertest
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .query({ from: 0, size: 10 })
          .expect(200);
      });
    });
  });
}
