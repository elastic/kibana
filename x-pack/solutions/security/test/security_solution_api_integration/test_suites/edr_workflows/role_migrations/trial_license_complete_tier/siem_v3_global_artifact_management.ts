/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FeaturesPrivileges, Role } from '@kbn/security-plugin-types-common';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const DEPRECATED_SIEM_VERSIONS = ['siem', 'siemV2'];

  // these artifact privileges are shared between ESS and Serverless, while Endpoint Exceptions privilege exists only on Serverless
  const ARTIFACTS = [
    'trusted_applications',
    'event_filters',
    'blocklist',
    'host_isolation_exceptions',
  ];

  const ROLE_NAME = 'siem_v3_test_role';

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
    return role.kibana[0].feature.siemV3;
  };

  describe('@ess @serverless @skipInServerlessMKI Role migrations towards siemV3', () => {
    afterEach(async () => {
      await supertest
        .delete(`/api/security/role/${ROLE_NAME}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .expect([204, 404]);
    });

    for (const deprecatedSiem of DEPRECATED_SIEM_VERSIONS) {
      describe(`from ${deprecatedSiem}`, () => {
        const putDeprecatedSiemPrivilegesInRole = putKibanaFeatureInRole(deprecatedSiem);

        describe(`${deprecatedSiem}:READ`, () => {
          it('should keep READ privilege', async () => {
            await putDeprecatedSiemPrivilegesInRole(['read']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql(['read']);
          });
        });

        describe(`${deprecatedSiem}:MINIMAL_READ`, () => {
          for (const artifact of ARTIFACTS) {
            it(`should NOT add global_artifact_management:ALL to ${artifact}:READ`, async () => {
              await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_read`]);

              expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                'minimal_read',
                `${artifact}_read`,
              ]);
            });
          }

          // Endpoint Exception privilege only exists on Serverless
          it('@skipInEss should NOT add global_artifact_management:ALL to endpoint_exceptions:READ', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read', `endpoint_exceptions_read`]);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_read',
              `endpoint_exceptions_read`,
            ]);
          });

          // adding Global Artifact Management to any artifact:WRITE privilege
          for (const artifact of ARTIFACTS) {
            it(`should add global_artifact_management:ALL to ${artifact}:ALL`, async () => {
              await putDeprecatedSiemPrivilegesInRole(['minimal_read', `${artifact}_all`]);

              expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                'minimal_read',
                `${artifact}_all`,
                'global_artifact_management_all',
              ]);
            });
          }

          // Endpoint Exception privilege only exists on Serverless
          it('@skipInEss should add global_artifact_management:ALL to endpoint_exceptions:ALL', async () => {
            await putDeprecatedSiemPrivilegesInRole(['minimal_read', 'endpoint_exceptions_all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              'minimal_read',
              'endpoint_exceptions_all',
              'global_artifact_management_all',
            ]);
          });
        });

        describe(`${deprecatedSiem}:ALL`, () => {
          // siem:ALL includes Endpoint Exceptions both on ESS and Serverless
          it('@skipInServerless should add global_artifact_management:ALL on ESS', async () => {
            await putDeprecatedSiemPrivilegesInRole(['all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              // sub-features toggle enabled to show Global Artifact Management
              'minimal_all',
              // Endpoint exceptions are tied to siem:ALL, hence the global_artifact_management_all to keep behaviour
              'global_artifact_management_all',
            ]);
          });

          it('@skipInEss should add global_artifact_management:ALL and endpoint_exceptions:ALL on serverless', async () => {
            await putDeprecatedSiemPrivilegesInRole(['all']);

            expect(await getMigratedSiemFeaturesFromRole()).to.eql([
              // sub-features toggle enabled to show Global Artifact Management
              'minimal_all',
              // Endpoint exceptions are tied to siem:ALL, hence the global_artifact_management_all to keep behaviour
              'global_artifact_management_all',
              // Enpdoint Exceptions were included in siem:ALL, so we need to include them in siem:MINIMAL_ALL
              'endpoint_exceptions_all',
            ]);
          });
        });

        describe(`${deprecatedSiem}:MINIMAL_ALL`, () => {
          // on ESS, siem:MINIMAL_ALL includes Endpoint Exceptions ALL
          describe('@skipInServerless ESS', () => {
            it('should add global_artifact_management:ALL', async () => {
              await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

              expect(await getMigratedSiemFeaturesFromRole()).to.eql([
                'minimal_all',
                'global_artifact_management_all',
              ]);
            });
          });

          // on Serverless, siem:MINIMAL_ALL means that Endpoint Exceptions is controlled by sub-feature privilege, it can be NONE
          describe('@skipInEss on Serverless', () => {
            it('@skipInEss should NOT add global_artifact_management:ALL', async () => {
              await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

              expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_all']);
            });

            for (const artifact of [...ARTIFACTS, 'endpoint_exceptions']) {
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
    }
  });
}
