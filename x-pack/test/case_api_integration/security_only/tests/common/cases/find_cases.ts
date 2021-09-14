/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  ensureSavedObjectIsAuthorized,
  findCases,
  createCase,
} from '../../../../common/lib/utils';
import {
  secOnlySpacesAll,
  obsOnlyReadSpacesAll,
  secOnlyReadSpacesAll,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecReadSpacesAll,
} from '../../../../common/lib/authentication/users';
import {
  obsOnlyDefaultSpaceAuth,
  obsSecDefaultSpaceAuth,
  secOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find_cases', () => {
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
          secOnlyDefaultSpaceAuth
        ),
        // Create case owned by the observability user
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
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
        {
          user: secOnlyReadSpacesAll,
          numberOfExpectedCases: 1,
          owners: ['securitySolutionFixture'],
        },
        {
          user: obsOnlyReadSpacesAll,
          numberOfExpectedCases: 1,
          owners: ['observabilityFixture'],
        },
        {
          user: obsSecReadSpacesAll,
          numberOfExpectedCases: 2,
          owners: ['securitySolutionFixture', 'observabilityFixture'],
        },
      ]) {
        const res = await findCases({
          supertest: supertestWithoutAuth,
          auth: {
            user: scenario.user,
            space: null,
          },
        });

        ensureSavedObjectIsAuthorized(res.cases, scenario.numberOfExpectedCases, scenario.owners);
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT read a case`, async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserDefaultSpaceAuth);

      await findCases({
        supertest: supertestWithoutAuth,
        auth: {
          user: noKibanaPrivileges,
          space: null,
        },
        expectedHttpCode: 403,
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserDefaultSpaceAuth);

      await findCases({
        supertest: supertestWithoutAuth,
        auth: { user: secOnlySpacesAll, space: 'space1' },
        expectedHttpCode: 404,
      });
    });

    it('should return the correct cases when trying to exploit RBAC through the search query parameter', async () => {
      await Promise.all([
        // super user creates a case with owner securitySolutionFixture
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserDefaultSpaceAuth),
        // super user creates a case with owner observabilityFixture
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserDefaultSpaceAuth
        ),
      ]);

      const res = await findCases({
        supertest: supertestWithoutAuth,
        query: {
          search: 'securitySolutionFixture observabilityFixture',
          searchFields: 'owner',
        },
        auth: secOnlyDefaultSpaceAuth,
      });

      ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
    });

    // This test is to prevent a future developer to add the filter attribute without taking into consideration
    // the authorizationFilter produced by the cases authorization class
    it('should NOT allow to pass a filter query parameter', async () => {
      await supertest
        .get(
          `${CASES_URL}/_find?sortOrder=asc&filter=cases.attributes.owner:"observabilityFixture"`
        )
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });

    // This test ensures that the user is not allowed to define the namespaces query param
    // so she cannot search across spaces
    it('should NOT allow to pass a namespaces query parameter', async () => {
      await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc&namespaces[0]=*`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);

      await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc&namespaces=*`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });

    it('should NOT allow to pass a non supported query parameter', async () => {
      await supertest
        .get(`${CASES_URL}/_find?notExists=papa`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });

    it('should respect the owner filter when having permissions', async () => {
      await Promise.all([
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          obsSecDefaultSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
        ),
      ]);

      const res = await findCases({
        supertest: supertestWithoutAuth,
        query: {
          owner: 'securitySolutionFixture',
          searchFields: 'owner',
        },
        auth: obsSecDefaultSpaceAuth,
      });

      ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
    });

    it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
      await Promise.all([
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          obsSecDefaultSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      // User with permissions only to security solution request cases from observability
      const res = await findCases({
        supertest: supertestWithoutAuth,
        query: {
          owner: ['securitySolutionFixture', 'observabilityFixture'],
        },
        auth: secOnlyDefaultSpaceAuth,
      });

      // Only security solution cases are being returned
      ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
    });
  });
};
