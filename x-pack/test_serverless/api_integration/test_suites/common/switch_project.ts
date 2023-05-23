/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('switch_project', function () {
    it('rejects request with invalid body', async () => {
      const { body, status } = await supertest
        .post(`/internal/serverless/switch_project`)
        .set(svlCommonApi.getCommonRequestHeader())
        .send({ invalid: 'body' });

      // in a non-serverless environment this would return a 404
      svlCommonApi.assertResponseStatusCode(400, status, body);
    });
  });
}
