/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { deleteCasesByESQuery, createCase, getCategories } from '../../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../../common/lib/mock';
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_categories', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return case categories', async () => {
      await createCase(supertest, getPostCaseRequest({ category: 'foo' }));
      await createCase(supertest, getPostCaseRequest({ category: 'bar' }));

      const categories = await getCategories({ supertest });
      expect(categories).to.eql(['bar', 'foo']);
    });

    it('should return unique categories', async () => {
      await createCase(supertest, getPostCaseRequest({ category: 'foobar' }));
      await createCase(supertest, getPostCaseRequest({ category: 'foobar' }));

      const categories = await getCategories({ supertest });
      expect(categories).to.eql(['foobar']);
    });

    describe('rbac', () => {
      it('should read the correct categories', async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture', category: 'sec' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture', category: 'obs' }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        for (const scenario of [
          {
            user: globalRead,
            expectedCategories: ['obs', 'sec'],
          },
          {
            user: superUser,
            expectedCategories: ['obs', 'sec'],
          },
          { user: secOnlyRead, expectedCategories: ['sec'] },
          { user: obsOnlyRead, expectedCategories: ['obs'] },
          {
            user: obsSecRead,
            expectedCategories: ['obs', 'sec'],
          },
        ]) {
          const categories = await getCategories({
            supertest: supertestWithoutAuth,
            expectedHttpCode: 200,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });

          expect(categories).to.eql(scenario.expectedCategories);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT get all categories`, async () => {
          // super user creates a case at the appropriate space
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture', category: 'sec' }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          // user should not be able to get all categories at the appropriate space
          await getCategories({
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
            getPostCaseRequest({ owner: 'securitySolutionFixture', category: 'sec' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture', category: 'obs' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        const categories = await getCategories({
          supertest: supertestWithoutAuth,
          auth: {
            user: obsSec,
            space: 'space1',
          },
          query: { owner: 'securitySolutionFixture' },
        });

        expect(categories).to.eql(['sec']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture', category: 'sec' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture', category: 'obs' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        // User with permissions only to security solution request categories from observability
        const categories = await getCategories({
          supertest: supertestWithoutAuth,
          auth: {
            user: secOnly,
            space: 'space1',
          },
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        });

        // Only security solution categories are being returned
        expect(categories).to.eql(['sec']);
      });
    });
  });
};
