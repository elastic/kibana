/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esSupertest = getService('esSupertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('Home', function () {
    it('can request /', async () => {
      const { body, status } = await esSupertest.get('/');
      svlCommonApi.assertResponseStatusCode(200, status, body);
    });
  });
}
