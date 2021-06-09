/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  deleteCases,
  getCase,
} from '../../../../common/lib/utils';
import {
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  globalRead,
  obsOnlyReadSpacesAll,
  obsSecReadSpacesAll,
  noKibanaPrivileges,
} from '../../../../common/lib/authentication/users';
import {
  obsOnlyDefaultSpaceAuth,
  secOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('delete_cases', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('User: security solution only - should delete a case', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 204,
        auth: secOnlyDefaultSpaceAuth,
      });
    });

    it('User: security solution only - should NOT delete a case of different owner', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 403,
        auth: obsOnlyDefaultSpaceAuth,
      });
    });

    it('should get an error if the user has not permissions to all requested cases', async () => {
      const caseSec = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      const caseObs = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        obsOnlyDefaultSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [caseSec.id, caseObs.id],
        expectedHttpCode: 403,
        auth: obsOnlyDefaultSpaceAuth,
      });

      // Cases should have not been deleted.
      await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseSec.id,
        expectedHttpCode: 200,
        auth: superUserDefaultSpaceAuth,
      });

      await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseObs.id,
        expectedHttpCode: 200,
        auth: superUserDefaultSpaceAuth,
      });
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
      } with role(s) ${user.roles.join()} - should NOT delete a case`, async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          superUserDefaultSpaceAuth
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 404,
        auth: { user: secOnlySpacesAll, space: 'space1' },
      });
    });
  });
};
