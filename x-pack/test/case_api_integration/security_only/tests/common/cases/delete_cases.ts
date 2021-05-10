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
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
} from '../../../../common/lib/authentication/users';
import { obsOnlyNoSpaceAuth, secOnlyNoSpaceAuth, superUserNoSpaceAuth } from '../../../utils';

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
        secOnlyNoSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 204,
        auth: secOnlyNoSpaceAuth,
      });
    });

    it('User: security solution only - should NOT delete a case of different owner', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 403,
        auth: obsOnlyNoSpaceAuth,
      });
    });

    it('should get an error if the user has not permissions to all requested cases', async () => {
      const caseSec = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      const caseObs = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        obsOnlyNoSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [caseSec.id, caseObs.id],
        expectedHttpCode: 403,
        auth: obsOnlyNoSpaceAuth,
      });

      // Cases should have not been deleted.
      await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseSec.id,
        expectedHttpCode: 200,
        auth: superUserNoSpaceAuth,
      });

      await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseObs.id,
        expectedHttpCode: 200,
        auth: superUserNoSpaceAuth,
      });
    });

    for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT delete a case`, async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          superUserNoSpaceAuth
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
        superUserNoSpaceAuth
      );

      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [postedCase.id],
        expectedHttpCode: 404,
        auth: { user: secOnly, space: 'space1' },
      });
    });
  });
};
