/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import util from 'util';
import { isEqual, isEqualWith } from 'lodash';
import expect from '@kbn/expect';
import { RawKibanaPrivileges } from '../../../../plugins/security/common/model';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Privileges', () => {
    describe('GET /api/security/privileges', () => {
      it('should return a privilege map with all known privileges, without actions', async () => {
        // If you're adding a privilege to the following, that's great!
        // If you're removing a privilege, this breaks backwards compatibility
        // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.
        const expected = {
          global: ['all', 'read'],
          space: ['all', 'read'],
          features: {
            graph: ['all', 'read'],
            savedObjectsTagging: ['all', 'read'],
            canvas: ['all', 'read'],
            maps: ['all', 'read'],
            fleet: ['all', 'read'],
            actions: ['all', 'read'],
            stackAlerts: ['all', 'read'],
            ml: ['all', 'read'],
            siem: ['all', 'read'],
            uptime: ['all', 'read'],
            securitySolutionCases: ['all', 'read'],
            infrastructure: ['all', 'read'],
            logs: ['all', 'read'],
            apm: ['all', 'read'],
            discover: [
              'all',
              'read',
              'minimal_all',
              'minimal_read',
              'url_create',
              'store_search_session',
            ],
            visualize: ['all', 'read', 'minimal_all', 'minimal_read', 'url_create'],
            dashboard: [
              'all',
              'read',
              'minimal_all',
              'minimal_read',
              'url_create',
              'store_search_session',
            ],
            dev_tools: ['all', 'read'],
            advancedSettings: ['all', 'read'],
            indexPatterns: ['all', 'read'],
            savedObjectsManagement: ['all', 'read'],
            osquery: [
              'all',
              'read',
              'minimal_all',
              'minimal_read',
              'live_queries_all',
              'live_queries_read',
              'run_saved_queries',
              'saved_queries_all',
              'saved_queries_read',
              'packs_all',
              'packs_read',
            ],
          },
          reserved: ['fleet-setup', 'ml_user', 'ml_admin', 'ml_apm_user', 'monitoring'],
        };

        await supertest
          .get('/api/security/privileges')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .expect((res: any) => {
            // when comparing privileges, the order of the features doesn't matter (but the order of the privileges does)
            // supertest uses assert.deepStrictEqual.
            // expect.js doesn't help us here.
            // and lodash's isEqual doesn't know how to compare Sets.
            const success = isEqualWith(res.body, expected, (value, other, key) => {
              if (Array.isArray(value) && Array.isArray(other)) {
                if (key === 'reserved') {
                  // order does not matter for the reserved privilege set.
                  return isEqual(value.sort(), other.sort());
                }
                // order matters for the rest, as the UI assumes they are returned in a descending order of permissiveness.
                return isEqual(value, other);
              }

              // Lodash types aren't correct, `undefined` should be supported as a return value here and it
              // has special meaning.
              return undefined as any;
            });

            if (!success) {
              throw new Error(
                `Expected ${util.inspect(res.body)} to equal ${util.inspect(expected)}`
              );
            }
          })
          .expect(200);
      });
    });

    describe('GET /api/security/privileges?includeActions=true', () => {
      // The UI assumes that no wildcards are present when calculating the effective set of privileges.
      // If this changes, then the "privilege calculators" will need revisiting to account for these wildcards.
      it('should return a privilege map with actions which do not include wildcards', async () => {
        await supertest
          .get('/api/security/privileges?includeActions=true')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .expect((res: any) => {
            const { features, global, space, reserved } = res.body as RawKibanaPrivileges;
            expect(features).to.be.an('object');
            expect(global).to.be.an('object');
            expect(space).to.be.an('object');
            expect(reserved).to.be.an('object');

            Object.entries(features).forEach(([featureId, featurePrivs]) => {
              Object.values(featurePrivs).forEach((actions) => {
                expect(actions).to.be.an('array');
                actions.forEach((action) => {
                  expect(action).to.be.a('string');
                  expect(action.indexOf('*')).to.eql(
                    -1,
                    `Feature ${featureId} with action ${action} cannot contain a wildcard`
                  );
                });
              });
            });

            Object.entries(global).forEach(([privilegeId, actions]) => {
              expect(actions).to.be.an('array');
              actions.forEach((action) => {
                expect(action).to.be.a('string');
                expect(action.indexOf('*')).to.eql(
                  -1,
                  `Global privilege ${privilegeId} with action ${action} cannot contain a wildcard`
                );
              });
            });

            Object.entries(space).forEach(([privilegeId, actions]) => {
              expect(actions).to.be.an('array');
              actions.forEach((action) => {
                expect(action).to.be.a('string');
                expect(action.indexOf('*')).to.eql(
                  -1,
                  `Space privilege ${privilegeId} with action ${action} cannot contain a wildcard`
                );
              });
            });

            Object.entries(reserved).forEach(([privilegeId, actions]) => {
              expect(actions).to.be.an('array');
              actions.forEach((action) => {
                expect(action).to.be.a('string');
                expect(action.indexOf('*')).to.eql(
                  -1,
                  `Reserved privilege ${privilegeId} with action ${action} cannot contain a wildcard`
                );
              });
            });
          });
      });
    });
  });
}
