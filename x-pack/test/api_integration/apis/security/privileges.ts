/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import util from 'util';
import { isEqual, isEqualWith } from 'lodash';
import expect from '@kbn/expect';
import { RawKibanaPrivileges } from '@kbn/security-plugin-types-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const expectedWithoutActions = {
    global: ['all', 'read'],
    space: ['all', 'read'],
    features: {
      graph: ['all', 'read', 'minimal_all', 'minimal_read'],
      savedObjectsTagging: ['all', 'read', 'minimal_all', 'minimal_read'],
      canvas: ['all', 'read', 'minimal_all', 'minimal_read', 'generate_report'],
      maps: ['all', 'read', 'minimal_all', 'minimal_read'],
      generalCases: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
      ],
      generalCasesV2: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
        'create_comment',
        'case_reopen',
      ],
      observabilityCases: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
      ],
      observabilityCasesV2: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
        'create_comment',
        'case_reopen',
      ],
      observabilityAIAssistant: ['all', 'read', 'minimal_all', 'minimal_read'],
      slo: ['all', 'read', 'minimal_all', 'minimal_read'],
      searchInferenceEndpoints: ['all', 'read', 'minimal_all', 'minimal_read'],
      fleetv2: ['all', 'read', 'minimal_all', 'minimal_read'],
      fleet: ['all', 'read', 'minimal_all', 'minimal_read'],
      actions: ['all', 'read', 'minimal_all', 'minimal_read'],
      stackAlerts: ['all', 'read', 'minimal_all', 'minimal_read'],
      ml: ['all', 'read', 'minimal_all', 'minimal_read'],
      siem: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'endpoint_list_all',
        'endpoint_list_read',
        'trusted_applications_all',
        'trusted_applications_read',
        'host_isolation_exceptions_all',
        'host_isolation_exceptions_read',
        'blocklist_all',
        'blocklist_read',
        'event_filters_all',
        'event_filters_read',
        'policy_management_all',
        'policy_management_read',
        'actions_log_management_all',
        'actions_log_management_read',
        'host_isolation_all',
        'process_operations_all',
        'file_operations_all',
        'execute_operations_all',
        'scan_operations_all',
      ],
      uptime: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'elastic_managed_locations_enabled',
        'can_manage_private_locations',
      ],
      securitySolutionAssistant: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'update_anonymization',
        'manage_global_knowledge_base',
      ],
      securitySolutionAttackDiscovery: ['all', 'read', 'minimal_all', 'minimal_read'],
      securitySolutionCases: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
      ],
      securitySolutionCasesV2: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'cases_delete',
        'cases_settings',
        'create_comment',
        'case_reopen',
      ],
      infrastructure: ['all', 'read', 'minimal_all', 'minimal_read'],
      logs: ['all', 'read', 'minimal_all', 'minimal_read'],
      dataQuality: ['all', 'read', 'minimal_all', 'minimal_read'],
      apm: ['all', 'read', 'minimal_all', 'minimal_read', 'settings_save'],
      discover: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'url_create',
        'store_search_session',
        'generate_report',
      ],
      visualize: ['all', 'read', 'minimal_all', 'minimal_read', 'url_create', 'generate_report'],
      dashboard: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'url_create',
        'store_search_session',
        'generate_report',
        'download_csv_report',
      ],
      dev_tools: ['all', 'read', 'minimal_all', 'minimal_read'],
      advancedSettings: ['all', 'read', 'minimal_all', 'minimal_read'],
      indexPatterns: ['all', 'read', 'minimal_all', 'minimal_read'],
      savedObjectsManagement: ['all', 'read', 'minimal_all', 'minimal_read'],
      savedQueryManagement: ['all', 'read', 'minimal_all', 'minimal_read'],
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
      enterpriseSearch: ['all', 'read', 'minimal_all', 'minimal_read'],
      filesManagement: ['all', 'read', 'minimal_all', 'minimal_read'],
      filesSharedImage: ['all', 'read', 'minimal_all', 'minimal_read'],
      rulesSettings: [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'allFlappingSettings',
        'readFlappingSettings',
      ],
      maintenanceWindow: ['all', 'read', 'minimal_all', 'minimal_read'],
      guidedOnboardingFeature: ['all', 'read', 'minimal_all', 'minimal_read'],
      aiAssistantManagementSelection: ['all', 'read', 'minimal_all', 'minimal_read'],
      inventory: ['all', 'read', 'minimal_all', 'minimal_read'],
      entityManager: ['all', 'read', 'minimal_all', 'minimal_read'],
    },
    reserved: ['fleet-setup', 'ml_user', 'ml_admin', 'ml_apm_user', 'monitoring'],
  };

  describe('Privileges', () => {
    describe('GET /api/security/privileges', () => {
      it('should return a privilege map with all known privileges, without actions', async () => {
        // If you're adding a privilege to the following, that's great!
        // If you're removing a privilege, this breaks backwards compatibility
        // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.

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
            const success = isEqualWith(res.body, expectedWithoutActions, (value, other, key) => {
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
                `Expected ${util.inspect(res.body)} to equal ${util.inspect(
                  expectedWithoutActions
                )}`
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

    // In this non-Basic case, results should be exactly the same as not supplying the respectLicenseLevel flag
    describe('GET /api/security/privileges?respectLicenseLevel=false', () => {
      it('should return a privilege map with all known privileges, without actions', async () => {
        // If you're adding a privilege to the following, that's great!
        // If you're removing a privilege, this breaks backwards compatibility
        // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.

        await supertest
          .get('/api/security/privileges?respectLicenseLevel=false')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .expect((res: any) => {
            // when comparing privileges, the order of the features doesn't matter (but the order of the privileges does)
            // supertest uses assert.deepStrictEqual.
            // expect.js doesn't help us here.
            // and lodash's isEqual doesn't know how to compare Sets.
            const success = isEqualWith(res.body, expectedWithoutActions, (value, other, key) => {
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
                `Expected ${util.inspect(res.body)} to equal ${util.inspect(
                  expectedWithoutActions
                )}`
              );
            }
          })
          .expect(200);
      });
    });

    // In this non-Basic case, results should be exactly the same as not supplying the respectLicenseLevel flag
    describe('GET /api/security/privileges?includeActions=true&respectLicenseLevel=false', () => {
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
