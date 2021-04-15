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

      const tags = await getTags(supertest);
      expect(tags).to.eql(['defacement', 'unique']);
    });

    describe('rbac', () => {
      it('User: security solution only - should read the correct tags', async () => {
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
            expectedTags: ['sec', 'obs'],
          },
          {
            user: superUser,
            expectedTags: ['sec', 'obs'],
          },
          { user: secOnlyRead, expectedTags: ['sec'] },
          { user: obsOnlyRead, expectedTags: ['obs'] },
          {
            user: obsSecRead,
            expectedTags: ['sec', 'obs'],
          },
        ]) {
          const tags = await getTags(supertestWithoutAuth, 200, {
            user: scenario.user,
            space: 'space1',
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
          await getTags(supertestWithoutAuth, 403, { user: scenario.user, space: scenario.space });
        });
      }
    });
  });
};
