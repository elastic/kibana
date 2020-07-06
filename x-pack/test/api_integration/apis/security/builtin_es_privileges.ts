/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Builtin ES Privileges', () => {
    describe('GET /internal/security/esPrivileges/builtin', () => {
      it('should return a list of available builtin privileges', async () => {
        await supertest
          .get('/internal/security/esPrivileges/builtin')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            const sampleOfExpectedClusterPrivileges = ['all', 'manage', 'monitor'];
            const sampleOfExpectedIndexPrivileges = ['create', 'index', 'delete'];

            const payload = response.body;
            expect(Object.keys(payload).sort()).to.eql(['cluster', 'index']);

            sampleOfExpectedClusterPrivileges.forEach((privilege) =>
              expect(payload.cluster).to.contain(privilege)
            );

            sampleOfExpectedIndexPrivileges.forEach((privilege) =>
              expect(payload.index).to.contain(privilege)
            );

            expect(payload.cluster).not.to.contain('none');
            expect(payload.index).not.to.contain('none');
          });
      });
    });
  });
}
