/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  deleteConfiguration,
  getConfiguration,
  createConfiguration,
  getConfigurationRequest,
  ensureSavedObjectIsAuthorized,
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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should return the correct configuration', async () => {
      await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'observabilityFixture' },
        200,
        obsOnlyDefaultSpaceAuth
      );

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
        const configuration = await getConfiguration({
          supertest: supertestWithoutAuth,
          query: { owner: scenario.owners },
          expectedHttpCode: 200,
          auth: {
            user: scenario.user,
            space: null,
          },
        });

        ensureSavedObjectIsAuthorized(
          configuration,
          scenario.numberOfExpectedCases,
          scenario.owners
        );
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT read a case configuration`, async () => {
      // super user creates a configuration at the appropriate space
      await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      // user should not be able to read configurations at the appropriate space
      await getConfiguration({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 403,
        auth: {
          user: noKibanaPrivileges,
          space: null,
        },
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await getConfiguration({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 404,
        auth: {
          user: secOnlySpacesAll,
          space: 'space1',
        },
      });
    });

    it('should respect the owner filter when having permissions', async () => {
      await Promise.all([
        createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest(),
          200,
          obsSecDefaultSpaceAuth
        ),
        createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      const res = await getConfiguration({
        supertest: supertestWithoutAuth,
        query: { owner: 'securitySolutionFixture' },
        auth: obsSecDefaultSpaceAuth,
      });

      ensureSavedObjectIsAuthorized(res, 1, ['securitySolutionFixture']);
    });

    it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
      await Promise.all([
        createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest(),
          200,
          obsSecDefaultSpaceAuth
        ),
        createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      // User with permissions only to security solution request cases from observability
      const res = await getConfiguration({
        supertest: supertestWithoutAuth,
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        auth: secOnlyDefaultSpaceAuth,
      });

      // Only security solution cases are being returned
      ensureSavedObjectIsAuthorized(res, 1, ['securitySolutionFixture']);
    });
  });
};
