/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers } from './index_lifecycle_management.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    loadPolicies,
    createPolicy,
    cleanUp,
  } = registerHelpers({ supertest, es });

  describe('lifecycle management', () => {
    after(() => cleanUp());

    describe('policies', () => {
      describe('list', () => {
        it('should have a default policy to manage the Watcher history indices', async () => {
          const { body } = await loadPolicies().expect(200);
          const [policy = {}] = body;

          // We manually set the date for deterministic test
          const modifiedDate = '2019-04-30T14:30:00.000Z';
          policy.modified_date = modifiedDate;

          expect(policy).to.eql({
            version: 1,
            modified_date: modifiedDate,
            policy: {
              phases: {
                delete: {
                  min_age: '7d',
                  actions: {
                    delete: {}
                  }
                }
              }
            },
            name: 'watch-history-ilm-policy'
          });
        });
      });

      describe('create', () => {
        it('should create a lifecycle policy', () => {
          return createPolicy().expect(200);
        });
      });
    });
  });
}
