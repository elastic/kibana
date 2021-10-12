/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { getPostCaseRequest } from '../../../../../common/lib/mock';
import { createCase, deleteCasesByESQuery, getReporters } from '../../../../../common/lib/utils';
import {
  secOnlySpacesAll,
  obsOnlySpacesAll,
  globalRead,
  superUser,
  secOnlyReadSpacesAll,
  obsOnlyReadSpacesAll,
  obsSecReadSpacesAll,
  noKibanaPrivileges,
  obsSecSpacesAll,
} from '../../../../../common/lib/authentication/users';
import { getUserInfo } from '../../../../../common/lib/authentication';
import {
  secOnlyDefaultSpaceAuth,
  obsOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
  obsSecDefaultSpaceAuth,
} from '../../../../utils';
import { UserInfo } from '../../../../../common/lib/authentication/types';

const sortReporters = (reporters: UserInfo[]) =>
  reporters.sort((a, b) => a.username.localeCompare(b.username));

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_reporters', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('User: security solution only - should read the correct reporters', async () => {
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        200,
        secOnlyDefaultSpaceAuth
      );

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        obsOnlyDefaultSpaceAuth
      );

      for (const scenario of [
        {
          user: globalRead,
          expectedReporters: [getUserInfo(secOnlySpacesAll), getUserInfo(obsOnlySpacesAll)],
        },
        {
          user: superUser,
          expectedReporters: [getUserInfo(secOnlySpacesAll), getUserInfo(obsOnlySpacesAll)],
        },
        { user: secOnlyReadSpacesAll, expectedReporters: [getUserInfo(secOnlySpacesAll)] },
        { user: obsOnlyReadSpacesAll, expectedReporters: [getUserInfo(obsOnlySpacesAll)] },
        {
          user: obsSecReadSpacesAll,
          expectedReporters: [getUserInfo(secOnlySpacesAll), getUserInfo(obsOnlySpacesAll)],
        },
      ]) {
        const reporters = await getReporters({
          supertest: supertestWithoutAuth,
          expectedHttpCode: 200,
          auth: {
            user: scenario.user,
            space: null,
          },
        });

        // sort reporters to prevent order failure
        expect(sortReporters(reporters as unknown as UserInfo[])).to.eql(
          sortReporters(scenario.expectedReporters)
        );
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT get all reporters`, async () => {
      // super user creates a case at the appropriate space
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserDefaultSpaceAuth);

      // user should not be able to get all reporters at the appropriate space
      await getReporters({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 403,
        auth: { user: noKibanaPrivileges, space: null },
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      await getReporters({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 404,
        auth: { user: obsSecSpacesAll, space: 'space1' },
      });
    });

    it('should respect the owner filter when having permissions', async () => {
      await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
        ),
      ]);

      const reporters = await getReporters({
        supertest: supertestWithoutAuth,
        auth: obsSecDefaultSpaceAuth,
        query: { owner: 'securitySolutionFixture' },
      });

      expect(reporters).to.eql([getUserInfo(secOnlySpacesAll)]);
    });

    it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
      await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
        ),
      ]);

      // User with permissions only to security solution request reporters from observability
      const reporters = await getReporters({
        supertest: supertestWithoutAuth,
        auth: secOnlyDefaultSpaceAuth,
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
      });

      // Only security solution reporters are being returned
      expect(reporters).to.eql([getUserInfo(secOnlySpacesAll)]);
    });
  });
};
