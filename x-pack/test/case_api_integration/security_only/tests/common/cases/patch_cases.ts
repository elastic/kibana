/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCaseReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  findCases,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyReadSpacesAll,
  obsSecReadSpacesAll,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  superUser,
} from '../../../../common/lib/authentication/users';
import {
  obsOnlyDefaultSpaceAuth,
  secOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    it('should update a case when the user has the correct permissions', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        postCaseReq,
        200,
        secOnlyDefaultSpaceAuth
      );

      const patchedCases = await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: 'new title',
            },
          ],
        },
        auth: secOnlyDefaultSpaceAuth,
      });

      expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
    });

    it('should update multiple cases when the user has the correct permissions', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertestWithoutAuth, postCaseReq, 200, superUserDefaultSpaceAuth),
        createCase(supertestWithoutAuth, postCaseReq, 200, superUserDefaultSpaceAuth),
        createCase(supertestWithoutAuth, postCaseReq, 200, superUserDefaultSpaceAuth),
      ]);

      const patchedCases = await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: case1.id,
              version: case1.version,
              title: 'new title',
            },
            {
              id: case2.id,
              version: case2.version,
              title: 'new title',
            },
            {
              id: case3.id,
              version: case3.version,
              title: 'new title',
            },
          ],
        },
        auth: secOnlyDefaultSpaceAuth,
      });

      expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
      expect(patchedCases[1].owner).to.eql('securitySolutionFixture');
      expect(patchedCases[2].owner).to.eql('securitySolutionFixture');
    });

    it('should not update a case when the user does not have the correct ownership', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        obsOnlyDefaultSpaceAuth
      );

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: 'new title',
            },
          ],
        },
        auth: secOnlyDefaultSpaceAuth,
        expectedHttpCode: 403,
      });
    });

    it('should not update any cases when the user does not have the correct ownership', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserDefaultSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserDefaultSpaceAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserDefaultSpaceAuth
        ),
      ]);

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: case1.id,
              version: case1.version,
              title: 'new title',
            },
            {
              id: case2.id,
              version: case2.version,
              title: 'new title',
            },
            {
              id: case3.id,
              version: case3.version,
              title: 'new title',
            },
          ],
        },
        auth: secOnlyDefaultSpaceAuth,
        expectedHttpCode: 403,
      });

      const resp = await findCases({ supertest, auth: getAuthWithSuperUser(null) });
      expect(resp.cases.length).to.eql(3);
      // the update should have failed and none of the title should have been changed
      expect(resp.cases[0].title).to.eql(postCaseReq.title);
      expect(resp.cases[1].title).to.eql(postCaseReq.title);
      expect(resp.cases[2].title).to.eql(postCaseReq.title);
    });

    for (const user of [
      globalRead,
      secOnlyReadSpacesAll,
      obsOnlyReadSpacesAll,
      obsSecReadSpacesAll,
      noKibanaPrivileges,
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT update a case`, async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          superUserDefaultSpaceAuth
        );

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: 'new title',
            },
          ],
        },
        auth: { user: secOnlySpacesAll, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
