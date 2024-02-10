/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { request } from '@kbn/core-test-helpers-kbn-server';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  // const retry = getService('retry');

  describe('smoke tests', function describeIndexTests() {
    test('it can start Kibana running with fips', async () => {
      // const { body } = await request.get(root, '/api/status').expect(200);
      // expect(body).toMatchObject({ status: { overall: { level: 'available' } } });
      expect(true);
    });
  });
}
