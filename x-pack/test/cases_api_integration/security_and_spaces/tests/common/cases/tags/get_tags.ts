/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { deleteCasesByESQuery, createCase, getTags } from '../../../../../common/lib/utils';
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

  describe('get_tags', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return case tags', async () => {
      await createCase(supertest, getPostCaseRequest());
      await createCase(supertest, getPostCaseRequest({ tags: ['unique'] }));

      const tags = await getTags({ supertest });
      expect(tags).to.eql(['defacement', 'unique']);
    });

    it('should return unique tags', async () => {
      await createCase(supertest, getPostCaseRequest());
      await createCase(supertest, getPostCaseRequest());

      const tags = await getTags({ supertest });
      expect(tags).to.eql(['defacement']);
    });

    describe('rbac', () => {
      it('should read the correct tags', async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        for (const scenario of [
          {
            user: globalRead,
            expectedTags: ['obs', 'sec'],
          },
          {
            user: superUser,
            expectedTags: ['obs', 'sec'],
          },
          { user: secOnlyRead, expectedTags: ['sec'] },
          { user: obsOnlyRead, expectedTags: ['obs'] },
          {
            user: obsSecRead,
            expectedTags: ['obs', 'sec'],
          },
        ]) {
          const tags = await getTags({
            supertest: supertestWithoutAuth,
            expectedHttpCode: 200,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });

          expect(tags).to.eql(scenario.expectedTags);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT get all tags`, async () => {
          // super user creates a case at the appropriate space
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          // user should not be able to get all tags at the appropriate space
          await getTags({
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
            getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        const tags = await getTags({
          supertest: supertestWithoutAuth,
          auth: {
            user: obsSec,
            space: 'space1',
          },
          query: { owner: 'securitySolutionFixture' },
        });

        expect(tags).to.eql(['sec']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        // User with permissions only to security solution request tags from observability
        const tags = await getTags({
          supertest: supertestWithoutAuth,
          auth: {
            user: secOnly,
            space: 'space1',
          },
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        });

        // Only security solution tags are being returned
        expect(tags).to.eql(['sec']);
      });
    });
  });
};
