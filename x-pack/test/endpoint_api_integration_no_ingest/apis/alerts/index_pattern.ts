/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Endpoint index pattern API without ingest manager initialized', () => {
    it('should not retrieve the index pattern for events', async () => {
      await supertest.get('/api/endpoint/index_pattern/events').expect(404);
    });
  });
}
