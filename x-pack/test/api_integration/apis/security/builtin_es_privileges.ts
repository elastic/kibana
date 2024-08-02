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
  const esVersion = getService('esVersion');

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

            // The `remote_cluster` built-in privilege was introduced in 8.15.0, but these tests are also run for
            // earlier stack versions (e.g., compatibility tests) where `remote_cluster` isn't available. We can get
            // rid of logic once we release 9.0 and switch compatibility test from 7.x branch to 8.x.
            expect(Object.keys(payload).sort()).to.eql(
              esVersion.matchRange('>=8.15.0')
                ? ['cluster', 'index', 'remote_cluster']
                : ['cluster', 'index']
            );

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
