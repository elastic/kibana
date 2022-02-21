/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { defaultUser, getPostCaseRequest } from '../../../../../common/lib/mock';
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_reporters', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return reporters', async () => {
      await createCase(supertest, getPostCaseRequest());
      const reporters = await getReporters({ supertest: supertestWithoutAuth });

      expect(reporters).to.eql([defaultUser]);
    });

    it('should return unique reporters', async () => {
      await createCase(supertest, getPostCaseRequest());
      await createCase(supertest, getPostCaseRequest());
      const reporters = await getReporters({ supertest: supertestWithoutAuth });

      expect(reporters).to.eql([defaultUser]);
    });

    describe('rbac', () => {
      it('User: security solution only - should read the correct reporters', async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        for (const scenario of [
          {
            user: globalRead,
            expectedReporters: [getUserInfo(obsOnly), getUserInfo(secOnly)],
          },
          {
            user: superUser,
            expectedReporters: [getUserInfo(obsOnly), getUserInfo(secOnly)],
          },
          { user: secOnlyRead, expectedReporters: [getUserInfo(secOnly)] },
          { user: obsOnlyRead, expectedReporters: [getUserInfo(obsOnly)] },
          {
            user: obsSecRead,
            expectedReporters: [getUserInfo(obsOnly), getUserInfo(secOnly)],
          },
        ]) {
          const reporters = await getReporters({
            supertest: supertestWithoutAuth,
            expectedHttpCode: 200,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });

          expect(reporters).to.eql(scenario.expectedReporters);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT get all reporters`, async () => {
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

          // user should not be able to get all reporters at the appropriate space
          await getReporters({
            supertest: supertestWithoutAuth,
            expectedHttpCode: 403,
            auth: { user: scenario.user, space: scenario.space },
          });
        });
      }

      it('should respect the owner filter when having permissions', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnly,
              space: 'space1',
            }
          ),
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

        const reporters = await getReporters({
          supertest: supertestWithoutAuth,
          auth: {
            user: obsSec,
            space: 'space1',
          },
          query: { owner: 'securitySolutionFixture' },
        });

        expect(reporters).to.eql([getUserInfo(secOnly)]);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnly,
              space: 'space1',
            }
          ),
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

        // User with permissions only to security solution request reporters from observability
        const reporters = await getReporters({
          supertest: supertestWithoutAuth,
          auth: {
            user: secOnly,
            space: 'space1',
          },
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        });

        // Only security solution reporters are being returned
        expect(reporters).to.eql([getUserInfo(secOnly)]);
      });
    });
  });
};
