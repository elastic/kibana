/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CaseStatuses } from '../../../../../../../plugins/cases/common/api';
import { getPostCaseRequest } from '../../../../../common/lib/mock';
import {
  createCase,
  updateCase,
  getAllCasesStatuses,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');

  describe('get_status', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const superUserAuth = getAuthWithSuperUser(null);

    it('should return the correct status stats', async () => {
      /**
       * Owner: Sec
       *  open: 0, in-prog: 1, closed: 1
       * Owner: Obs
       *  open: 1, in-prog: 1
       */
      const [inProgressSec, closedSec, , inProgressObs] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserAuth),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserAuth
        ),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserAuth
        ),
      ]);

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: inProgressSec.id,
              version: inProgressSec.version,
              status: CaseStatuses['in-progress'],
            },
            {
              id: closedSec.id,
              version: closedSec.version,
              status: CaseStatuses.closed,
            },
            {
              id: inProgressObs.id,
              version: inProgressObs.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
        auth: superUserAuth,
      });

      for (const scenario of [
        { user: globalRead, stats: { open: 1, inProgress: 2, closed: 1 } },
        { user: superUser, stats: { open: 1, inProgress: 2, closed: 1 } },
        { user: secOnlyRead, stats: { open: 0, inProgress: 1, closed: 1 } },
        { user: obsOnlyRead, stats: { open: 1, inProgress: 1, closed: 0 } },
        { user: obsSecRead, stats: { open: 1, inProgress: 2, closed: 1 } },
      ]) {
        const statuses = await getAllCasesStatuses({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
        });

        expect(statuses).to.eql({
          count_open_cases: scenario.stats.open,
          count_closed_cases: scenario.stats.closed,
          count_in_progress_cases: scenario.stats.inProgress,
        });
      }
    });

    it(`should return a 403 when retrieving the statuses when the user ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()}`, async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserAuth);

      await getAllCasesStatuses({
        supertest: supertestWithoutAuth,
        auth: { user: noKibanaPrivileges, space: null },
        expectedHttpCode: 403,
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, superUserAuth);

      await getAllCasesStatuses({
        supertest: supertestWithoutAuth,
        auth: { user: secOnly, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
