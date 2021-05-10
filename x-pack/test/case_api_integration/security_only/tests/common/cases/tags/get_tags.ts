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
  globalRead,
  superUser,
  secOnlyRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
} from '../../../../../common/lib/authentication/users';
import { secOnlyNoSpaceAuth, obsOnlyNoSpaceAuth, obsSecNoSpaceAuth } from '../../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_tags', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should read the correct tags', async () => {
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
        200,
        secOnlyNoSpaceAuth
      );

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
        200,
        obsOnlyNoSpaceAuth
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
        const tags = await getTags({
          supertest: supertestWithoutAuth,
          expectedHttpCode: 200,
          auth: {
            user: scenario.user,
            space: null,
          },
        });

        expect(tags).to.eql(scenario.expectedTags);
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT get all tags`, async () => {
      // super user creates a case at the appropriate space
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
        200,
        {
          user: superUser,
          space: null,
        }
      );

      // user should not be able to get all tags at the appropriate space
      await getTags({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 403,
        auth: { user: noKibanaPrivileges, space: null },
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      // super user creates a case at the appropriate space
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
        200,
        {
          user: superUser,
          space: null,
        }
      );

      await getTags({
        supertest: supertestWithoutAuth,
        expectedHttpCode: 404,
        auth: { user: secOnly, space: 'space1' },
      });
    });

    it('should respect the owner filter when having permissions', async () => {
      await Promise.all([
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture', tags: ['sec'] }),
          200,
          obsSecNoSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
          200,
          obsSecNoSpaceAuth
        ),
      ]);

      const tags = await getTags({
        supertest: supertestWithoutAuth,
        auth: obsSecNoSpaceAuth,
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
          obsSecNoSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture', tags: ['obs'] }),
          200,
          obsSecNoSpaceAuth
        ),
      ]);

      // User with permissions only to security solution request tags from observability
      const tags = await getTags({
        supertest: supertestWithoutAuth,
        auth: secOnlyNoSpaceAuth,
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
      });

      // Only security solution tags are being returned
      expect(tags).to.eql(['sec']);
    });
  });
};
