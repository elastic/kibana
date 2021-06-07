/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('API Keys', () => {
    describe('GET /internal/security/api_key/_enabled', () => {
      it('should indicate that API Keys are enabled', async () => {
        await supertest
          .get('/internal/security/api_key/_enabled')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            const payload = response.body;
            expect(payload).to.eql({ apiKeysEnabled: true });
          });
      });
    });

    describe('POST /internal/security/api_key', () => {
      it('should allow an API Key to be created', async () => {
        await supertest
          .post('/internal/security/api_key')
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_api_key',
            expiration: '12d',
            role_descriptors: {
              role_1: {
                cluster: ['monitor'],
              },
            },
          })
          .expect(200)
          .then((response: Record<string, any>) => {
            const { name } = response.body;
            expect(name).to.eql('test_api_key');
          });
      });

      it('should allow an API Key to be created with metadata', async () => {
        await supertest
          .post('/internal/security/api_key')
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_api_key_with_metadata',
            metadata: {
              foo: 'bar',
            },
          })
          .expect(200)
          .then((response: Record<string, any>) => {
            const { name } = response.body;
            expect(name).to.eql('test_api_key_with_metadata');
          });
      });
    });
  });
}
