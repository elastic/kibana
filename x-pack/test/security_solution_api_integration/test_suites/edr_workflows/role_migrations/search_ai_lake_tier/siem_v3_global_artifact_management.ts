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

  describe('@serverless @skipInServerlessMKI Role migrations towards siemV3 without Endpoint product line', () => {
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

        it(`should keep ${deprecatedSiem}:READ privilege`, async () => {
          await putDeprecatedSiemPrivilegesInRole(['read']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql(['read']);
        });

        it(`should keep ${deprecatedSiem}:MINIMAL_READ privilege`, async () => {
          await putDeprecatedSiemPrivilegesInRole(['minimal_read']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_read']);
        });

        it(`should keep ${deprecatedSiem}:ALL privilege`, async () => {
          await putDeprecatedSiemPrivilegesInRole(['all']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql(['all']);
        });

        it(`should keep ${deprecatedSiem}:MINIMAL_ALL privilege`, async () => {
          await putDeprecatedSiemPrivilegesInRole(['minimal_all']);

          expect(await getMigratedSiemFeaturesFromRole()).to.eql(['minimal_all']);
        });
      });
    }
  });
}
