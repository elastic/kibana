/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('test metadata api when ingest manager is not initialized', () => {
    before(async () => await esArchiver.load('endpoint/metadata/api_feature'));
    after(async () => await esArchiver.unload('endpoint/metadata/api_feature'));
    it('metadata api should not return results', async () => {
      await supertest.post('/api/endpoint/metadata').set('kbn-xsrf', 'xxx').send().expect(500);
    });
  });
}
