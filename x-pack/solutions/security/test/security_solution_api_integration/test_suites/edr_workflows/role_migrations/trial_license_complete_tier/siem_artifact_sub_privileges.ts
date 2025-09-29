/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FeaturesPrivileges, Role } from '@kbn/security-plugin-types-common';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const PRE_SIEM_V4_ESS_ARTIFACTS = [
    'trusted_applications',
    'event_filters',
    'blocklist',
    'host_isolation_exceptions',
  ];
  const ALL_ARTIFACTS = [...PRE_SIEM_V4_ESS_ARTIFACTS, 'endpoint_exceptions'];
  const ROLE_NAME = 'siem_test_role';

  const putKibanaFeatureInRole = (feature: string) => (privileges: string[]) =>
    supertest
      .put(`/api/security/role/${ROLE_NAME}`)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
      .send({
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            base: [],
            feature: {
              [feature]: privileges,
            },
            spaces: ['*'],
          },
        ],
      })
      .expect(204);

  const getMigratedSiemFeaturesFromRole = async (): Promise<FeaturesPrivileges[string]> => {
    const response = await supertest
      .get(`/api/security/role/${ROLE_NAME}`)
      .query({ replaceDeprecatedPrivileges: true }) // triggering on-the-fly role migration
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
      .expect(200);

    const role = response.body as Role;
    expect(role._transform_error).to.have.length(
      0,
      `Role migration encountered an error, probably a non-existing privilege is added.
      Transform error: ${JSON.stringify(role._transform_error)}`
    );

    // migrating from `siem` adds timeline and notes, but in this test it is irrelevant
    return role.kibana[0].feature[SECURITY_FEATURE_ID];
  };

  describe('@ess @serverless @skipInServerlessMKI `siem` role migrations for Artifact sub-privileges', () => {
    after(async () => {
      await supertest
        .delete(`/api/security/role/${ROLE_NAME}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .expect([204, 404]);
    });

    describe(`From siemV3 - adding Endpoint exceptions`, () => {
      const putDeprecatedSiemPrivilegesInRole = putKibanaFeatureInRole('siemV3');

      describe(`siemV3:READ`, () => {
        it('should add endpoint_exceptions:READ', async () => {
          await putDeprecatedSiemPrivilegesInRole(['read']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql([
            // sub-features toggle enabled to show Endpoint exceptions
            'minimal_read',
            // Endpoint Exceptions were included in siem:READ, so we need to enable it explicitly
            'endpoint_exceptions_read',
          ]);
        });
      });

      describe(`siemV3:MINIMAL_READ`, () => {
        describe('@skipInServerless on ESS', () => {
          it('should add endpoint_exceptions:READ', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_read',
              // Endpoint Exceptions were included in siem:MINIMAL_READ, so we need to enable it explicitly
              'endpoint_exceptions_read',
            ]);
          });
        });

        describe('@skipInEss on Serverless', () => {
          it('should keep endpoint_exceptions:NONE', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_read']);
          });

          it('should keep endpoint_exceptions:READ', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read', 'endpoint_exceptions_read']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_read',
              'endpoint_exceptions_read',
            ]);
          });

          it('should keep endpoint_exceptions:ALL', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read', 'endpoint_exceptions_all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_read',
              'endpoint_exceptions_all',
            ]);
          });
        });
      });

      describe(`siemV3:ALL`, () => {
        it('should add endpoint_exceptions:ALL', async () => {
          await putDeprecatedSiemPrivilegesInRole(['all']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql([
            // sub-features toggle enabled to show Endpoint exceptions
            'minimal_all',
            // Endpoint Exceptions were included in siem:ALL, so we need to enable it explicitly
            'endpoint_exceptions_all',
          ]);
        });
      });

      describe('siemV3:MINIMAL_ALL', () => {
        describe('@skipInServerless on ESS', () => {
          it('should add endpoint_exceptions:ALL', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_all',
              // Endpoint Exceptions were included in siem:MINIMAL_ALL, so we need to enable it explicitly
              'endpoint_exceptions_all',
            ]);
          });
        });

        describe('@skipInEss on Serverless', () => {
          it('should keep endpoint_exceptions:NONE', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_all']);
          });

          it('should keep endpoint_exceptions:READ', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_all', 'endpoint_exceptions_read']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_all',
              'endpoint_exceptions_read',
            ]);
          });

          it('should keep endpoint_exceptions:ALL', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_all', 'endpoint_exceptions_all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_all',
              'endpoint_exceptions_all',
            ]);
          });
        });
      });
    });

    describe('From `siem` and `siemV2` - adding Endpoint exceptions and Global artifact management', () => {
      for (const deprecatedSiem of ['siemV2', 'siem'] as const) {
        describe(`from ${deprecatedSiem}`, () => {
          const putDeprecatedSiemPrivilegesInRole = putKibanaFeatureInRole(deprecatedSiem);

          describe(`Sub-feature 1: adding Endpoint Exceptions`, () => {
            describe(`${deprecatedSiem}:READ`, () => {
              it('should add endpoint_exceptions:READ', async () => {
                await putDeprecatedSiemPrivilegesInRole(['read']);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  'minimal_read',
                  'endpoint_exceptions_read',
                ]);
              });
            });

            describe(`${deprecatedSiem}:MINIMAL_READ`, () => {
              describe('@skipInServerless on ESS', () => {
                it('should add endpoint_exceptions:READ', async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_read']);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_read',
                    'endpoint_exceptions_read',
                  ]);
                });
              });

              describe('@skipInEss on Serverless', () => {
                it('should keep endpoint_exceptions:NONE', async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_read']);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_read']);
                });

                it('should keep endpoint_exceptions:READ', async () => {
                  await putDeprecatedSiemPrivilegesInRole([
                    'minimal_read',
                    'endpoint_exceptions_read',
                  ]);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_read',
                    'endpoint_exceptions_read',
                  ]);
                });

                it('should keep endpoint_exceptions:ALL', async () => {
                  await putDeprecatedSiemPrivilegesInRole([
                    'minimal_read',
                    'endpoint_exceptions_all',
                  ]);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_read',
                    'endpoint_exceptions_all',
                    'global_artifact_management_all',
                  ]);
                });
              });
            });

            describe(`${deprecatedSiem}:ALL`, () => {
              it('should add endpoint_exceptions:ALL and global_artifact_management:ALL', async () => {
                await putDeprecatedSiemPrivilegesInRole(['all']);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  'minimal_all',
                  'global_artifact_management_all',
                  'endpoint_exceptions_all',
                ]);
              });
            });

            describe(`${deprecatedSiem}:MINIMAL_ALL`, () => {
              describe('@skipInServerless on ESS', () => {
                it('should add endpoint_exceptions:ALL', async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_all',
                    'global_artifact_management_all',
                    'endpoint_exceptions_all',
                  ]);
                });
              });

              describe('@skipInEss on Serverless', () => {
                it('should keep endpoint_exceptions:NONE', async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_all']);
                });

                it('should keep endpoint_exceptions:READ', async () => {
                  await putDeprecatedSiemPrivilegesInRole([
                    'minimal_all',
                    'endpoint_exceptions_read',
                  ]);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_all',
                    'endpoint_exceptions_read',
                  ]);
                });

                it('should keep endpoint_exceptions:ALL', async () => {
                  await putDeprecatedSiemPrivilegesInRole([
                    'minimal_all',
                    'endpoint_exceptions_all',
                  ]);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                    'minimal_all',
                    'endpoint_exceptions_all',
                    'global_artifact_management_all',
                  ]);
                });
              });
            });
          });

          describe('Sub-feature 2: adding Global Artifact Management', () => {
            describe(`${deprecatedSiem}:MINIMAL_READ`, () => {
              for (const artifact of PRE_SIEM_V4_ESS_ARTIFACTS) {
                it(`should NOT add global_artifact_management:ALL to ${artifact}:READ`, async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_read`]);

                  const migratedPrivilages = await getMigratedSiemFeaturesFromRole();
                  // testing existence/absence instead of strict equality as Endpoint exceptions are added on ESS, see above test cases
                  expect(migratedPrivilages).to.contain('minimal_read');
                  expect(migratedPrivilages).to.contain(`${artifact}_read`);
                  expect(migratedPrivilages).not.to.contain('global_artifact_management_all');
                });
              }

              // Endpoint Exception privilege only existed on Serverless pre siemV4
              it('@skipInEss should NOT add global_artifact_management:ALL to endpoint_exceptions:READ', async () => {
                await putDeprecatedSiemPrivilegesInRole([
                  'minimal_read',
                  `endpoint_exceptions_read`,
                ]);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  'minimal_read',
                  `endpoint_exceptions_read`,
                ]);
              });

              // adding Global Artifact Management to any artifact:WRITE privilege
              for (const artifact of PRE_SIEM_V4_ESS_ARTIFACTS) {
                it(`should add global_artifact_management:ALL to ${artifact}:ALL`, async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_all`]);

                  const migratedPrivilages = await getMigratedSiemFeaturesFromRole();
                  // testing existence instead of strict equality as Endpoint exceptions are added on ESS, see above test cases
                  expect(migratedPrivilages).to.contain('minimal_read');
                  expect(migratedPrivilages).to.contain(`${artifact}_all`);
                  expect(migratedPrivilages).to.contain('global_artifact_management_all');
                });
              }

              // Endpoint Exception privilege only existed on Serverless pre siemV4
              it('@skipInEss should add global_artifact_management:ALL to endpoint_exceptions:ALL', async () => {
                await putDeprecatedSiemPrivilegesInRole([
                  'minimal_read',
                  'endpoint_exceptions_all',
                ]);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  'minimal_read',
                  'endpoint_exceptions_all',
                  'global_artifact_management_all',
                ]);
              });
            });

            describe(`${deprecatedSiem}:ALL`, () => {
              // siem:ALL includes Endpoint Exceptions both on ESS and Serverless
              it('should add global_artifact_management:ALL', async () => {
                await putDeprecatedSiemPrivilegesInRole(['all']);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  // sub-features toggle enabled to show new sub-features
                  'minimal_all',
                  'global_artifact_management_all',
                  'endpoint_exceptions_all',
                ]);
              });
            });

            describe(`${deprecatedSiem}:MINIMAL_ALL`, () => {
              // on ESS, siem:MINIMAL_ALL included Endpoint Exceptions ALL
              it('@skipInServerless should add global_artifact_management:ALL on ESS', async () => {
                await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

                expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                  'minimal_all',
                  'global_artifact_management_all',
                  'endpoint_exceptions_all',
                ]);
              });

              // on Serverless, siem:MINIMAL_ALL means that Endpoint Exceptions is controlled by sub-feature privilege
              describe('@skipInEss on Serverless', () => {
                it('@skipInEss should NOT add global_artifact_management:ALL', async () => {
                  await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

                  expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_all']);
                });

                for (const artifact of ALL_ARTIFACTS) {
                  it(`should NOT add global_artifact_management:ALL to ${artifact}:READ`, async () => {
                    await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_read`]);

                    expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                      'minimal_read',
                      `${artifact}_read`,
                    ]);
                  });

                  it(`should add global_artifact_management:ALL to ${artifact}:ALL`, async () => {
                    await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_all`]);

                    expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                      'minimal_read',
                      `${artifact}_all`,
                      'global_artifact_management_all',
                    ]);
                  });
                }
              });
            });
          });
        });
      }
    });
  });
}
