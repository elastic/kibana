/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Endpoint alert API without ingest manager initialized', () => {
    before(async () => {
      await esArchiver.load('endpoint/alerts/api_feature');
      await esArchiver.load('endpoint/alerts/host_api_feature');
    });

    after(async () => {
      await esArchiver.unload('endpoint/alerts/api_feature');
      await esArchiver.unload('endpoint/alerts/host_api_feature');
    });

    it('should not return data', async () => {
      await supertest.get('/api/endpoint/alerts').expect(500);
    });
  });
}
