/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CaseStatuses } from '../../../../../../../plugins/cases/common/api';
import { getPostCaseRequest, postCaseReq } from '../../../../../common/lib/mock';
import {
  createCase,
  updateCase,
  getAllCasesStatuses,
  deleteAllCaseItems,
  superUserSpace1Auth,
  extractWarningValueFromWarningHeader,
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
import { CASE_STATUS_URL } from '../../../../../../../plugins/cases/common/constants';
import { assertWarningHeader } from '../../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('get_status', () => {
    it('should return case statuses', async () => {
      const [, inProgressCase, postedCase] = await Promise.all([
        createCase(supertest, postCaseReq),
        createCase(supertest, postCaseReq),
        createCase(supertest, postCaseReq),
      ]);

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: inProgressCase.id,
              version: inProgressCase.version,
              status: CaseStatuses['in-progress'],
            },
            {
              id: postedCase.id,
              version: postedCase.version,
              status: CaseStatuses.closed,
            },
          ],
        },
      });

      const statuses = await getAllCasesStatuses({ supertest });

      expect(statuses).to.eql({
        count_open_cases: 1,
        count_closed_cases: 1,
        count_in_progress_cases: 1,
      });
    });

    describe('range queries', () => {
      before(async () => {
        await deleteAllCaseItems(es);
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json'
        );
        await deleteAllCaseItems(es);
      });

      it('returns all cases without a range filter', async () => {
        const statuses = await getAllCasesStatuses({ supertest });

        expect(statuses).to.eql({
          count_open_cases: 3,
          count_closed_cases: 0,
          count_in_progress_cases: 0,
        });
      });

      it('respects the range parameters', async () => {
        const queries = [
          { expectedCases: 2, query: { from: '2022-03-16' } },
          { expectedCases: 2, query: { to: '2022-03-21' } },
          { expectedCases: 2, query: { from: '2022-03-15', to: '2022-03-21' } },
        ];

        for (const query of queries) {
          const statuses = await getAllCasesStatuses({ supertest, query: query.query });
          expect(statuses).to.eql({
            count_open_cases: query.expectedCases,
            count_closed_cases: 0,
            count_in_progress_cases: 0,
          });
        }
      });

      it('returns a bad request on malformed parameter', async () => {
        await getAllCasesStatuses({ supertest, query: { from: '<' }, expectedHttpCode: 400 });
      });
    });

    describe('rbac', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should return the correct status stats', async () => {
        /**
         * Owner: Sec
         *  open: 0, in-prog: 1, closed: 1
         * Owner: Obs
         *  open: 1, in-prog: 1
         */
        const [inProgressSec, closedSec, , inProgressObs] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            superUserSpace1Auth
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            superUserSpace1Auth
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
          auth: superUserSpace1Auth,
        });

        for (const scenario of [
          { user: globalRead, stats: { open: 1, inProgress: 2, closed: 1 } },
          { user: superUser, stats: { open: 1, inProgress: 2, closed: 1 } },
          { user: secOnlyRead, stats: { open: 0, inProgress: 1, closed: 1 } },
          { user: obsOnlyRead, stats: { open: 1, inProgress: 1, closed: 0 } },
          { user: obsSecRead, stats: { open: 1, inProgress: 2, closed: 1 } },
          {
            user: obsSecRead,
            stats: { open: 1, inProgress: 1, closed: 0 },
            owner: 'observabilityFixture',
          },
          {
            user: obsSecRead,
            stats: { open: 1, inProgress: 2, closed: 1 },
            owner: ['observabilityFixture', 'securitySolutionFixture'],
          },
        ]) {
          const statuses = await getAllCasesStatuses({
            supertest: supertestWithoutAuth,
            auth: { user: scenario.user, space: 'space1' },
            query: {
              owner: scenario.owner,
            },
          });

          expect(statuses).to.eql({
            count_open_cases: scenario.stats.open,
            count_closed_cases: scenario.stats.closed,
            count_in_progress_cases: scenario.stats.inProgress,
          });
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`should return a 403 when retrieving the statuses when the user ${
          scenario.user.username
        } with role(s) ${scenario.user.roles.join()} and space ${scenario.space}`, async () => {
          await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
            user: superUser,
            space: scenario.space,
          });

          await getAllCasesStatuses({
            supertest: supertestWithoutAuth,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }

      describe('range queries', () => {
        before(async () => {
          await kibanaServer.importExport.load(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json',
            { space: 'space1' }
          );
        });

        after(async () => {
          await kibanaServer.importExport.unload(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_various_dates.json',
            { space: 'space1' }
          );
          await deleteAllCaseItems(es);
        });

        it('should respect the owner filter when using range queries', async () => {
          const res = await getAllCasesStatuses({
            supertest: supertestWithoutAuth,
            query: {
              from: '2022-03-15',
              to: '2022-03-21',
            },
            auth: {
              user: secOnly,
              space: 'space1',
            },
          });

          expect(res).to.eql({
            count_open_cases: 1,
            count_closed_cases: 0,
            count_in_progress_cases: 0,
          });
        });
      });
    });

    describe('deprecations', () => {
      it('should return a warning header', async () => {
        await createCase(supertest, postCaseReq);
        const res = await supertest.get(CASE_STATUS_URL).expect(200);
        const warningHeader = res.header.warning;

        assertWarningHeader(warningHeader);

        const warningValue = extractWarningValueFromWarningHeader(warningHeader);
        expect(warningValue).to.be('Deprecated endpoint');
      });
    });
  });
};
