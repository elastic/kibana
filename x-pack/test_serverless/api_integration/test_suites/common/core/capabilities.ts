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
  describe('/api/core/capabilities', () => {
    it(`returns a 400 when an invalid app id is provided`, async () => {
      const { body } = await supertest
        .post('/api/core/capabilities')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          applications: ['dashboard', 'discover', 'bad%app'],
        })
        .expect(400);
      expect(body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body.applications.2]: Invalid application id',
      });
    });
  });
}
