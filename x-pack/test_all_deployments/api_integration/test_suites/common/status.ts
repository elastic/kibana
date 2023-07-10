/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const commonApi = getService('commonApi');
  const supertest = getService('supertest');

  describe('Status API', function () {
    it('gets the status', async () => {
      const { body, status } = await supertest
        .get(`/api/status`)
        .set(commonApi.getCommonRequestHeader());

      commonApi.assertResponseStatusCode(200, status, body);
    });
  });
}
