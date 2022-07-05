/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { APP_ID } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';

import {
  createCase,
  deleteAllCaseItems,
  deleteCases,
  getCase,
} from '../../../cases_api_integration/common/lib/utils';
import { casesAllUser, casesNoDeleteUser, casesOnlyDeleteUser, users } from './common/users';
import { roles } from './common/roles';
import { getPostCaseRequest } from '../../../cases_api_integration/common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  describe('feature privilege', () => {
    const APP_ID = 'cases';
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

    before(async () => {
      await createUsersAndRoles(getService, users, roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const user of [casesAllUser, casesNoDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 200, {
          user,
          space: null,
        });
      });
    }

    for (const user of [casesAllUser, casesNoDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        const retrievedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        expect(caseInfo.owner).to.eql(retrievedCase.owner);
      });
    }

    for (const user of [casesOnlyDeleteUser]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 403, {
          user,
          space: null,
        });
      });
    }

    for (const user of [casesOnlyDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} cannot get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const user of [casesAllUser, casesOnlyDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 204,
          auth: { user, space: null },
        });
      });
    }

    for (const user of [casesNoDeleteUser]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }
  });
};
