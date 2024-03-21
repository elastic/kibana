/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { CASES_INTERNAL_URL } from '@kbn/cases-plugin/common/constants';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, findCasesResp, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  ensureSavedObjectIsAuthorized,
  deleteAllCaseItems,
  searchCases,
  createCase,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';
import {
  obsOnly,
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecRead,
  obsSec,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('search_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('basic tests', () => {
      it('filters by single customField', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: 'this is a text field value',
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        const cases = await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [true] }, owner: 'securitySolutionFixture' },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('filters by multiple customField', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
                {
                  key: 'valid_key_3',
                  label: 'another_toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: false,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
            {
              key: 'valid_key_3',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        const postedCase2 = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: 'this is a text field value',
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'valid_key_3',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const cases = await searchCases({
          supertest,
          body: {
            customFields: { valid_key_2: [true], valid_key_3: [false] },
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase2],
          count_open_cases: 1,
        });
      });

      it('filters by customField with correct owner', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
                {
                  key: 'valid_key_3',
                  label: 'another_toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: false,
                },
              ],
            },
          })
        );

        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_obs_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_obs_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
                {
                  key: 'valid_obs_key_3',
                  label: 'another_toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: false,
                },
              ],
              owner: 'observabilityFixture',
            },
          })
        );

        const secCase = await createCase(supertest, {
          ...postCaseReq,
          owner: 'securitySolutionFixture',
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
            {
              key: 'valid_key_3',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        const obsCase = await createCase(supertest, {
          ...postCaseReq,
          owner: 'observabilityFixture',
          customFields: [
            {
              key: 'valid_obs_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_obs_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
            {
              key: 'valid_obs_key_3',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        expect(
          await searchCases({
            supertest,
            body: { customFields: { valid_key_2: [false] }, owner: 'securitySolutionFixture' },
          })
        ).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [secCase],
          count_open_cases: 1,
        });

        expect(
          await searchCases({
            supertest,
            body: { customFields: { valid_obs_key_2: [false] }, owner: 'observabilityFixture' },
          })
        ).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [obsCase],
          count_open_cases: 1,
        });
      });

      it('filters by customField and tags', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: 'this is a text field value',
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
          tags: ['unique'],
        });

        const cases = await searchCases({
          supertest,
          body: {
            customFields: { valid_key_2: [true] },
            tags: ['unique'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });
    });

    describe('errors', () => {
      it('unhappy path - 400s when no owner', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
              owner: 'securitySolutionFixture',
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [false] } },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when multiple owners', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
              owner: 'securitySolutionFixture',
            },
          })
        );

        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_obs_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_obs_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
                {
                  key: 'valid_obs_key_3',
                  label: 'another_toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: false,
                },
              ],
              owner: 'observabilityFixture',
            },
          })
        );

        await searchCases({
          supertest,
          body: {
            customFields: { valid_key_2: [false], valid_obs_key_2: [false] },
            owner: ['observabilityFixture', 'securitySolutionFixture'],
          },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when customFieldConfiguration owner and search customFields owner are different ', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
              owner: 'securitySolutionFixture',
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [false] }, owner: 'observabilityFixture' },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when configuration is empty', async () => {
        await createConfiguration(supertest, getConfigurationRequest({}));
        await searchCases({
          supertest,
          body: { customFields: { random_key: [false] }, owner: 'securitySolutionFixture' },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when invalid custom field key passed', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { random_key: [false] }, owner: 'securitySolutionFixture' },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when invalid value of custom field', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [1234] }, owner: 'securitySolutionFixture' },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when custom field type is non filterable', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_1: ['hello!'] }, owner: 'securitySolutionFixture' },
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return the correct cases', async () => {
        await Promise.all([
          // Create case owned by the security solution user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnly,
              space: 'space1',
            }
          ),
          // Create case owned by the observability user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsOnly,
              space: 'space1',
            }
          ),
        ]);

        for (const scenario of [
          {
            user: globalRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          {
            user: superUser,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          { user: secOnlyRead, numberOfExpectedCases: 1, owners: ['securitySolutionFixture'] },
          { user: obsOnlyRead, numberOfExpectedCases: 1, owners: ['observabilityFixture'] },
          {
            user: obsSecRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
        ]) {
          const res = await searchCases({
            supertest: supertestWithoutAuth,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
            body: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
          });

          ensureSavedObjectIsAuthorized(res.cases, scenario.numberOfExpectedCases, scenario.owners);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT read a case`, async () => {
          // super user creates a case at the appropriate space
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          // user should not be able to read cases at the appropriate space
          await searchCases({
            supertest: supertestWithoutAuth,
            auth: {
              user: scenario.user,
              space: scenario.space,
            },
            body: { owner: 'securitySolutionFixture' },
            expectedHttpCode: 403,
          });
        });
      }

      // This test is to prevent a future developer to add the filter attribute without taking into consideration
      // the authorizationFilter produced by the cases authorization class
      it('should NOT allow to pass a filter', async () => {
        await supertest
          .post(`${CASES_INTERNAL_URL}/_search`)
          .set('kbn-xsrf', 'true')
          .send({
            sortOrder: 'asc',
            filter: `{cases.attributes.owner:"observabilityFixture"}`,
            owner: 'observabilityFixture',
          })
          .expect(400);
      });

      it('should NOT allow to pass non-valid fields', async () => {
        await searchCases({
          supertest,
          body: {
            searchFields: ['foobar'],
            search: 'some search string*',
            owner: 'observabilityFixture',
          },
          expectedHttpCode: 400,
        });
      });

      // This test ensures that the user is not allowed to define the namespaces query param
      // so she cannot search across spaces
      it('should NOT allow to pass a namespaces', async () => {
        await supertest
          .post(`${CASES_INTERNAL_URL}/_search`)
          .set('kbn-xsrf', 'true')
          .send({
            sortOrder: 'asc',
            filter: `{namespaces[0]=*}`,
            owner: 'observabilityFixture',
          })
          .expect(400);

        await supertest
          .post(`${CASES_INTERNAL_URL}/_search`)
          .set('kbn-xsrf', 'true')
          .send({
            sortOrder: 'asc',
            namespaces: '*',
            owner: 'observabilityFixture',
          })
          .expect(400);
      });

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest
          .post(`${CASES_INTERNAL_URL}/_search`)
          .set('kbn-xsrf', 'true')
          .send({ notExists: 'papa', owner: 'observabilityFixture' })
          .expect(400);
      });

      it('should respect the owner filter when having permissions', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        const res = await searchCases({
          supertest: supertestWithoutAuth,
          body: {
            owner: 'securitySolutionFixture',
          },
          auth: {
            user: obsSec,
            space: 'space1',
          },
        });

        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        // User with permissions only to security solution request cases from observability
        const res = await searchCases({
          supertest: supertestWithoutAuth,
          body: {
            owner: ['securitySolutionFixture', 'observabilityFixture'],
          },
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        // Only security solution cases are being returned
        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

      describe('range queries', () => {
        before(async () => {
          await kibanaServer.importExport.load(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json',
            { space: 'space1' }
          );
        });

        after(async () => {
          await kibanaServer.importExport.unload(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json',
            { space: 'space1' }
          );
          await deleteAllCaseItems(es);
        });

        it('should respect the owner filter when using range queries', async () => {
          const res = await searchCases({
            supertest: supertestWithoutAuth,
            body: {
              from: '2022-03-15',
              to: '2022-03-21',
              owner: 'securitySolutionFixture',
            },
            auth: {
              user: secOnly,
              space: 'space1',
            },
          });

          // Only security solution cases are being returned
          ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
        });
      });

      describe('RBAC query filter', () => {
        it('should return the correct cases when trying to query filter by severity', async () => {
          await Promise.all([
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsSec,
                space: 'space1',
              }
            ),
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsSec,
                space: 'space1',
              }
            ),
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'observabilityFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsOnly,
                space: 'space1',
              }
            ),
          ]);

          // User with permissions only to security solution should get only the security solution cases
          const res = await searchCases({
            supertest: supertestWithoutAuth,
            body: {
              severity: CaseSeverity.HIGH,
              owner: 'securitySolutionFixture',
            },
            auth: {
              user: secOnly,
              space: 'space1',
            },
          });

          // Only security solution cases are being returned
          ensureSavedObjectIsAuthorized(res.cases, 2, ['securitySolutionFixture']);
        });
      });
    });
  });
};
