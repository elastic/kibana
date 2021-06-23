/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CaseResponse, CaseStatuses } from '../../../../../../plugins/cases/common/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  getCaseUserActions,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  superUser,
} from '../../../../common/lib/authentication/users';
import { superUserDefaultSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');

  describe('get_all_user_actions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    let caseInfo: CaseResponse;
    beforeEach(async () => {
      caseInfo = await createCase(
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
              id: caseInfo.id,
              version: caseInfo.version,
              status: CaseStatuses.closed,
            },
          ],
        },
        auth: superUserDefaultSpaceAuth,
      });
    });

    it('should get the user actions for a case when the user has the correct permissions', async () => {
      for (const user of [
        globalRead,
        superUser,
        secOnlySpacesAll,
        secOnlyReadSpacesAll,
        obsSecSpacesAll,
        obsSecReadSpacesAll,
      ]) {
        const userActions = await getCaseUserActions({
          supertest: supertestWithoutAuth,
          caseID: caseInfo.id,
          auth: { user, space: null },
        });

        expect(userActions.length).to.eql(2);
      }
    });

    it(`should 403 when requesting the user actions of a case with user ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()}`, async () => {
      await getCaseUserActions({
        supertest: supertestWithoutAuth,
        caseID: caseInfo.id,
        auth: { user: noKibanaPrivileges, space: null },
        expectedHttpCode: 403,
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      await getCaseUserActions({
        supertest: supertestWithoutAuth,
        caseID: caseInfo.id,
        auth: { user: secOnlySpacesAll, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
