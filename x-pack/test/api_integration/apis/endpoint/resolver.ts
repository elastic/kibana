/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const commonHeaders = {
  Accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('Resolver api', function() {
    it('should respond to hello-world', async function() {
      const { body } = await supertest
        .get('/api/endpoint/hello-world')
        .set(commonHeaders)
        .expect('Content-Type', /application\/json/)
        .expect(200);

      expect(body).to.eql({ hello: 'world' });
    });
  });
}
