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
  secOnly,
  obsOnly,
  globalRead,
  superUser,
  secOnlyRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  obsSec,
} from '../../../../../common/lib/authentication/users';
import { getUserInfo } from '../../../../../common/lib/authentication';
import {
  secOnlyNoSpaceAuth,
  obsOnlyNoSpaceAuth,
  superUserNoSpaceAuth,
  obsSecNoSpaceAuth,
} from '../../../../utils';

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
        secOnlyNoSpaceAuth
      );

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        obsOnlyNoSpaceAuth
      );

      for (const scenario of [
        {
          user: globalRead,
          expectedReporters: [getUserInfo(secOnly), getUserInfo(obsOnly)],
        },
        {
          user: superUser,
          expectedReporters: [getUserInfo(secOnly), getUserInfo(obsOnly)],
        },
        { user: secOnlyRead, expectedReporters: [getUserInfo(secOnly)] },
        { user: obsOnlyRead, expectedReporters: [getUserInfo(obsOnly)] },
        {
          user: obsSecRead,
          expectedReporters: [getUserInfo(secOnly), getUserInfo(obsOnly)],
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

        expect(reporters).to.eql(scenario.expectedReporters);
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT get all reporters`, async () => {
      // super user creates a case at the appropriate space
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserNoSpaceAuth);

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
        auth: { user: obsSec, space: 'space1' },
      });
    });

    it('should respect the owner filter when having permissions', async () => {
      await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyNoSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyNoSpaceAuth
        ),
      ]);

      const reporters = await getReporters({
        supertest: supertestWithoutAuth,
        auth: obsSecNoSpaceAuth,
        query: { owner: 'securitySolutionFixture' },
      });

      expect(reporters).to.eql([getUserInfo(secOnly)]);
    });

    it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
      await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyNoSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyNoSpaceAuth
        ),
      ]);

      // User with permissions only to security solution request reporters from observability
      const reporters = await getReporters({
        supertest: supertestWithoutAuth,
        auth: secOnlyNoSpaceAuth,
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
      });

      // Only security solution reporters are being returned
      expect(reporters).to.eql([getUserInfo(secOnly)]);
    });
  });
};
