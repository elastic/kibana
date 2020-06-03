/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Endpoint index pattern API', () => {
    it('should retrieve the index pattern for events', async () => {
      const { body } = await supertest.get('/api/endpoint/index_pattern/events').expect(200);
      expect(body.indexPattern).to.eql('events-endpoint-*');
    });

    it('should retrieve the index pattern for metadata', async () => {
      const { body } = await supertest.get('/api/endpoint/index_pattern/metadata').expect(200);
      expect(body.indexPattern).to.eql('metrics-endpoint.metadata-*');
    });

    it('should retrieve the index pattern for policy', async () => {
      const { body } = await supertest.get('/api/endpoint/index_pattern/policy').expect(200);
      expect(body.indexPattern).to.eql('metrics-endpoint.policy-*');
    });

    it('should not retrieve the index pattern for an invalid key', async () => {
      await supertest.get('/api/endpoint/index_pattern/blah').expect(404);
    });
  });
}
