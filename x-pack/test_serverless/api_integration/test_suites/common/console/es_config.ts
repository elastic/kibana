/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('GET /api/console/es_config', () => {
    it('returns es host', async () => {
      const { body } = await supertest
        .get('/api/console/es_config')
        .set('kbn-xsrf', 'true')
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(200);
      expect(body.host).to.be.ok();
    });
  });
}
