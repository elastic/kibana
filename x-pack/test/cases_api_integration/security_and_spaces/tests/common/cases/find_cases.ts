/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v1 as uuidv1 } from 'uuid';

import expect from '@kbn/expect';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import {
  CaseResponse,
  CaseSeverity,
  CaseStatuses,
  CommentType,
} from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  postCaseReq,
  postCommentUserReq,
  findCasesResp,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  ensureSavedObjectIsAuthorized,
  findCases,
  createCase,
  updateCase,
  createComment,
} from '../../../../common/lib/api';
import {
  obsOnly,
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecRead,
  obsSec,
} from '../../../../common/lib/authentication/users';

interface CaseAttributes {
  cases: {
    title: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('find_cases', () => {
    describe('basic tests', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return empty response', async () => {
        const cases = await findCases({ supertest });
        expect(cases).to.eql(findCasesResp);
      });

      it('should return cases', async () => {
        const a = await createCase(supertest, postCaseReq);
        const b = await createCase(supertest, postCaseReq);
        const c = await createCase(supertest, postCaseReq);

        const cases = await findCases({ supertest });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 3,
          cases: [a, b, c],
          count_open_cases: 3,
        });
      });

      it('filters by tags', async () => {
        await createCase(supertest, postCaseReq);
        const postedCase = await createCase(supertest, { ...postCaseReq, tags: ['unique'] });
        const cases = await findCases({ supertest, query: { tags: ['unique'] } });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('filters by status', async () => {
        await createCase(supertest, postCaseReq);
        const toCloseCase = await createCase(supertest, postCaseReq);
        const patchedCase = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: toCloseCase.id,
                version: toCloseCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        const cases = await findCases({ supertest, query: { status: CaseStatuses.closed } });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [patchedCase[0]],
          count_open_cases: 1,
          count_closed_cases: 1,
          count_in_progress_cases: 0,
        });
      });

      it('filters by severity', async () => {
        await createCase(supertest, postCaseReq);
        const theCase = await createCase(supertest, postCaseReq);
        const patchedCase = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: theCase.id,
                version: theCase.version,
                severity: CaseSeverity.HIGH,
              },
            ],
          },
        });

        const cases = await findCases({ supertest, query: { severity: CaseSeverity.HIGH } });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [patchedCase[0]],
          count_open_cases: 1,
        });
      });

      it('filters by severity (none found)', async () => {
        await createCase(supertest, postCaseReq);
        await createCase(supertest, postCaseReq);

        const cases = await findCases({ supertest, query: { severity: CaseSeverity.CRITICAL } });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 0,
          cases: [],
        });
      });

      it('filters by reporters', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const cases = await findCases({ supertest, query: { reporters: 'elastic' } });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('correctly counts comments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // post 2 comments
        await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });

        const cases = await findCases({ supertest });
        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [
            {
              ...patchedCase,
              comments: [],
              totalComment: 2,
            },
          ],
          count_open_cases: 1,
        });
      });

      it('correctly counts open/closed/in-progress', async () => {
        await createCase(supertest, postCaseReq);
        const inProgressCase = await createCase(supertest, postCaseReq);
        const postedCase = await createCase(supertest, postCaseReq);

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: inProgressCase.id,
                version: inProgressCase.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          },
        });

        const cases = await findCases({ supertest });
        expect(cases.count_open_cases).to.eql(1);
        expect(cases.count_closed_cases).to.eql(1);
        expect(cases.count_in_progress_cases).to.eql(1);
      });

      it('returns the correct fields', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        // all fields that contain the UserRt definition must be included here (aka created_by, closed_by, and updated_by)
        // see https://github.com/elastic/kibana/issues/139503
        const queryFields: Array<keyof CaseResponse | Array<keyof CaseResponse>> = [
          ['title', 'created_by', 'closed_by', 'updated_by'],
          ['title', 'description', 'created_by', 'closed_by', 'updated_by'],
        ];

        for (const fields of queryFields) {
          const cases = await findCases({ supertest, query: { fields } });
          const fieldsAsArray = Array.isArray(fields) ? fields : [fields];

          const expectedValues = fieldsAsArray.reduce(
            (theCase, field) => ({
              ...theCase,
              [field]: postedCase[field],
            }),
            {}
          );

          expect(cases).to.eql({
            ...findCasesResp,
            total: 1,
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                external_service: postedCase.external_service,
                owner: postedCase.owner,
                connector: postedCase.connector,
                severity: postedCase.severity,
                status: postedCase.status,
                comments: [],
                totalAlerts: 0,
                totalComment: 0,
                ...expectedValues,
              },
            ],
            count_open_cases: 1,
          });
        }
      });

      it('sorts by title', async () => {
        const case3 = await createCase(supertest, { ...postCaseReq, title: 'c' });
        const case2 = await createCase(supertest, { ...postCaseReq, title: 'b' });
        const case1 = await createCase(supertest, { ...postCaseReq, title: 'a' });

        const cases = await findCases({
          supertest,
          query: { sortField: 'title', sortOrder: 'asc' },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 3,
          cases: [case1, case2, case3],
          count_open_cases: 3,
        });
      });

      it('unhappy path - 400s when bad query supplied', async () => {
        await findCases({ supertest, query: { perPage: true }, expectedHttpCode: 400 });
      });

      for (const field of ['owner', 'tags', 'severity', 'status']) {
        it(`should return a 400 when attempting to query a keyword field [${field}] when using a wildcard query`, async () => {
          await findCases({
            supertest,
            query: { searchFields: [field], search: 'some search string*' },
            expectedHttpCode: 400,
          });
        });
      }

      it('sorts by severity', async () => {
        const case4 = await createCase(supertest, {
          ...postCaseReq,
          severity: CaseSeverity.CRITICAL,
        });
        const case3 = await createCase(supertest, {
          ...postCaseReq,
          severity: CaseSeverity.HIGH,
        });
        const case2 = await createCase(supertest, {
          ...postCaseReq,
          severity: CaseSeverity.MEDIUM,
        });
        const case1 = await createCase(supertest, { ...postCaseReq, severity: CaseSeverity.LOW });

        const cases = await findCases({
          supertest,
          query: { sortField: 'severity', sortOrder: 'asc' },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 4,
          cases: [case1, case2, case3, case4],
          count_open_cases: 4,
        });
      });

      describe('search and searchField', () => {
        beforeEach(async () => {
          await createCase(supertest, postCaseReq);
        });

        afterEach(async () => {
          await deleteAllCaseItems(es);
        });

        it('should successfully find a case when using valid searchFields', async () => {
          const cases = await findCases({
            supertest,
            query: { searchFields: ['title', 'description'], search: 'Issue' },
          });

          expect(cases.total).to.be(1);
        });

        it('should successfully find a case when not passing the searchFields parameter', async () => {
          const cases = await findCases({
            supertest,
            query: { search: 'Issue' },
          });

          expect(cases.total).to.be(1);
        });

        it('should successfully find a case when using a valid uuid', async () => {
          const caseWithId = await createCase(supertest, postCaseReq);

          const cases = await findCases({
            supertest,
            query: { searchFields: ['title', 'description'], search: caseWithId.id },
          });

          expect(cases.total).to.be(1);
          expect(cases.cases[0].id).to.equal(caseWithId.id);
        });

        it('should successfully find a case with a valid uuid in title', async () => {
          const uuid = uuidv1();
          await createCase(supertest, { ...postCaseReq, title: uuid });

          const cases = await findCases({
            supertest,
            query: { searchFields: ['title', 'description'], search: uuid },
          });

          expect(cases.total).to.be(1);
          expect(cases.cases[0].title).to.equal(uuid);
        });

        it('should successfully find a case with a valid uuid in title', async () => {
          const uuid = uuidv1();
          await createCase(supertest, { ...postCaseReq, description: uuid });

          const cases = await findCases({
            supertest,
            query: { searchFields: ['title', 'description'], search: uuid },
          });

          expect(cases.total).to.be(1);
          expect(cases.cases[0].description).to.equal(uuid);
        });

        it('should not find any cases when it does not use a wildcard and the string does not match', async () => {
          const cases = await findCases({
            supertest,
            query: { search: 'Iss' },
          });

          expect(cases.total).to.be(0);
        });

        it('should find a case when it uses a wildcard', async () => {
          const cases = await findCases({
            supertest,
            query: { search: 'Iss*' },
          });

          expect(cases.total).to.be(1);
        });
      });
    });

    describe('alerts', () => {
      const defaultSignalsIndex = '.siem-signals-default-000001';
      const signalID = '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78';
      const signalID2 = '1023bcfea939643c5e51fd8df53797e0ea693cee547db579ab56d96402365c1e';

      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
      });

      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
        await deleteAllCaseItems(es);
      });

      it('correctly counts alerts ignoring duplicates', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        /**
         * Adds three comments of type alerts.
         * The first two have the same alertId.
         * The third has different alertId.
         */
        for (const alertId of [signalID, signalID, signalID2]) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          // There is potential for the alert index to not be refreshed by the time the second comment is created
          // which could attempt to update the alert status again and will encounter a conflict so this will
          // ensure that the index is up to date before we try to update the next alert status
          await es.indices.refresh({ index: defaultSignalsIndex });
        }

        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });

        const cases = await findCases({ supertest });
        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [
            {
              ...patchedCase,
              comments: [],
              totalAlerts: 2,
              totalComment: 1,
            },
          ],
          count_open_cases: 1,
        });
      });
    });

    describe('find_cases pagination', () => {
      const numCases = 10;
      before(async () => {
        await createCasesWithTitleAsNumber(numCases);
      });

      after(async () => {
        await deleteAllCaseItems(es);
      });

      const createCasesWithTitleAsNumber = async (total: number): Promise<CaseResponse[]> => {
        const responsePromises = [];
        for (let i = 0; i < total; i++) {
          // this doesn't guarantee that the cases will be created in order that the for-loop executes,
          // for example case with title '2', could be created before the case with title '1' since we're doing a promise all here
          // A promise all is just much faster than doing it one by one which would have guaranteed that the cases are
          // created in the order that the for-loop executes
          responsePromises.push(createCase(supertest, { ...postCaseReq, title: `${i}` }));
        }
        const responses = await Promise.all(responsePromises);
        return responses;
      };

      /**
       * This is used to retrieve all the cases in the same sorted order that we're expecting them to come back via the
       * _find API so that we have a more true comparison instead of using the _find API to get all the cases which
       * could mangle the results if the implementation had a bug.
       *
       * Ideally we could enforce how the cases are created in reasonable time, waiting for each api call to finish takes
       * around 30 seconds which seemed too slow
       */
      const getAllCasesSortedByCreatedAtAsc = async () => {
        const cases = await es.search<CaseAttributes>({
          index: '.kibana',
          body: {
            size: 10000,
            sort: [{ 'cases.created_at': { unmapped_type: 'date', order: 'asc' } }],
            query: {
              term: { type: 'cases' },
            },
          },
        });
        return cases.hits.hits.map((hit) => hit._source);
      };

      it('returns the correct total when perPage is less than the total', async () => {
        const cases = await findCases({
          supertest,
          query: {
            page: 1,
            perPage: 5,
          },
        });

        expect(cases.cases.length).to.eql(5);
        expect(cases.total).to.eql(10);
        expect(cases.page).to.eql(1);
        expect(cases.per_page).to.eql(5);
        expect(cases.count_open_cases).to.eql(10);
        expect(cases.count_closed_cases).to.eql(0);
        expect(cases.count_in_progress_cases).to.eql(0);
      });

      it('returns the correct total when perPage is greater than the total', async () => {
        const cases = await findCases({
          supertest,
          query: {
            page: 1,
            perPage: 11,
          },
        });

        expect(cases.total).to.eql(10);
        expect(cases.page).to.eql(1);
        expect(cases.per_page).to.eql(11);
        expect(cases.cases.length).to.eql(10);
        expect(cases.count_open_cases).to.eql(10);
        expect(cases.count_closed_cases).to.eql(0);
        expect(cases.count_in_progress_cases).to.eql(0);
      });

      it('returns the correct total when perPage is equal to the total', async () => {
        const cases = await findCases({
          supertest,
          query: {
            page: 1,
            perPage: 10,
          },
        });

        expect(cases.total).to.eql(10);
        expect(cases.page).to.eql(1);
        expect(cases.per_page).to.eql(10);
        expect(cases.cases.length).to.eql(10);
        expect(cases.count_open_cases).to.eql(10);
        expect(cases.count_closed_cases).to.eql(0);
        expect(cases.count_in_progress_cases).to.eql(0);
      });

      it('returns the second page of results', async () => {
        const perPage = 5;
        const cases = await findCases({
          supertest,
          query: {
            page: 2,
            perPage,
          },
        });

        expect(cases.total).to.eql(10);
        expect(cases.page).to.eql(2);
        expect(cases.per_page).to.eql(5);
        expect(cases.cases.length).to.eql(5);
        expect(cases.count_open_cases).to.eql(10);
        expect(cases.count_closed_cases).to.eql(0);
        expect(cases.count_in_progress_cases).to.eql(0);

        const allCases = await getAllCasesSortedByCreatedAtAsc();

        cases.cases.map((caseInfo, index) => {
          // we started on the second page of 10 cases with a perPage of 5, so the first case should 0 + 5 (index + perPage)
          expect(caseInfo.title).to.eql(allCases[index + perPage]?.cases.title);
        });
      });

      it('paginates with perPage of 2 through 10 total cases', async () => {
        const total = 10;
        const perPage = 2;

        // it's less than or equal here because the page starts at 1, so page 5 is a valid page number
        // and should have case titles 9, and 10
        for (let currentPage = 1; currentPage <= total / perPage; currentPage++) {
          const cases = await findCases({
            supertest,
            query: {
              page: currentPage,
              perPage,
            },
          });

          expect(cases.total).to.eql(total);
          expect(cases.page).to.eql(currentPage);
          expect(cases.per_page).to.eql(perPage);
          expect(cases.cases.length).to.eql(perPage);
          expect(cases.count_open_cases).to.eql(total);
          expect(cases.count_closed_cases).to.eql(0);
          expect(cases.count_in_progress_cases).to.eql(0);

          const allCases = await getAllCasesSortedByCreatedAtAsc();

          cases.cases.map((caseInfo, index) => {
            // for page 1, the cases tiles should be 0,1,2 for page 2: 3,4,5 etc (assuming the titles were sorted
            // correctly)
            expect(caseInfo.title).to.eql(
              allCases[index + perPage * (currentPage - 1)]?.cases.title
            );
          });
        }
      });

      it('retrieves the last three cases', async () => {
        const cases = await findCases({
          supertest,
          query: {
            // this should skip the first 7 cases and only return the last 3
            page: 2,
            perPage: 7,
          },
        });

        expect(cases.total).to.eql(10);
        expect(cases.page).to.eql(2);
        expect(cases.per_page).to.eql(7);
        expect(cases.cases.length).to.eql(3);
        expect(cases.count_open_cases).to.eql(10);
        expect(cases.count_closed_cases).to.eql(0);
        expect(cases.count_in_progress_cases).to.eql(0);
      });
    });

    describe('range queries', () => {
      before(async () => {
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
        const EXPECTED_CASES = 3;
        const cases = await findCases({ supertest });

        expect(cases.total).to.be(EXPECTED_CASES);
        expect(cases.count_open_cases).to.be(EXPECTED_CASES);
        expect(cases.cases.length).to.be(EXPECTED_CASES);
      });

      it('respects the range parameters', async () => {
        const queries = [
          { expectedCases: 2, query: { from: '2022-03-16' } },
          { expectedCases: 2, query: { to: '2022-03-21' } },
          { expectedCases: 2, query: { from: '2022-03-15', to: '2022-03-21' } },
        ];

        for (const query of queries) {
          const cases = await findCases({
            supertest,
            query: query.query,
          });

          expect(cases.total).to.be(query.expectedCases);
          expect(cases.count_open_cases).to.be(query.expectedCases);
          expect(cases.cases.length).to.be(query.expectedCases);
        }
      });

      it('escapes correctly', async () => {
        const cases = await findCases({
          supertest,
          query: { from: '2022-03-15T10:16:56.252Z', to: '2022-03-20T10:16:56.252' },
        });

        expect(cases.total).to.be(2);
        expect(cases.count_open_cases).to.be(2);
        expect(cases.cases.length).to.be(2);
      });
    });

    describe('rbac', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return the correct cases', async () => {
        await Promise.all([
          // Create case owned by the security solution user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnly,
              space: 'space1',
            }
          ),
          // Create case owned by the observability user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsOnly,
              space: 'space1',
            }
          ),
        ]);

        for (const scenario of [
          {
            user: globalRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          {
            user: superUser,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          { user: secOnlyRead, numberOfExpectedCases: 1, owners: ['securitySolutionFixture'] },
          { user: obsOnlyRead, numberOfExpectedCases: 1, owners: ['observabilityFixture'] },
          {
            user: obsSecRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
        ]) {
          const res = await findCases({
            supertest: supertestWithoutAuth,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });

          ensureSavedObjectIsAuthorized(res.cases, scenario.numberOfExpectedCases, scenario.owners);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT read a case`, async () => {
          // super user creates a case at the appropriate space
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          // user should not be able to read cases at the appropriate space
          await findCases({
            supertest: supertestWithoutAuth,
            auth: {
              user: scenario.user,
              space: scenario.space,
            },
            expectedHttpCode: 403,
          });
        });
      }

      it('should return the correct cases when trying to exploit RBAC through the search query parameter', async () => {
        await Promise.all([
          // super user creates a case with owner securitySolutionFixture
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          // super user creates a case with owner observabilityFixture
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
        ]);

        const res = await findCases({
          supertest: supertestWithoutAuth,
          query: {
            search: 'securitySolutionFixture observabilityFixture',
            searchFields: 'owner',
          },
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

      // This test is to prevent a future developer to add the filter attribute without taking into consideration
      // the authorizationFilter produced by the cases authorization class
      it('should NOT allow to pass a filter query parameter', async () => {
        await supertest
          .get(
            `${CASES_URL}/_find?sortOrder=asc&filter=cases.attributes.owner:"observabilityFixture"`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      // This test ensures that the user is not allowed to define the namespaces query param
      // so she cannot search across spaces
      it('should NOT allow to pass a namespaces query parameter', async () => {
        await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&namespaces[0]=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);

        await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&namespaces=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest
          .get(`${CASES_URL}/_find?notExists=papa`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should respect the owner filter when having permissions', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        const res = await findCases({
          supertest: supertestWithoutAuth,
          query: {
            owner: 'securitySolutionFixture',
            searchFields: 'owner',
          },
          auth: {
            user: obsSec,
            space: 'space1',
          },
        });

        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        // User with permissions only to security solution request cases from observability
        const res = await findCases({
          supertest: supertestWithoutAuth,
          query: {
            owner: ['securitySolutionFixture', 'observabilityFixture'],
          },
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        // Only security solution cases are being returned
        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

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
          const res = await findCases({
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

          // Only security solution cases are being returned
          ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
        });
      });

      describe('RBAC query filter', () => {
        it('should return the correct cases when trying to query filter by severity', async () => {
          await Promise.all([
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsSec,
                space: 'space1',
              }
            ),
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsSec,
                space: 'space1',
              }
            ),
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'observabilityFixture', severity: CaseSeverity.HIGH }),
              200,
              {
                user: obsOnly,
                space: 'space1',
              }
            ),
          ]);

          // User with permissions only to security solution should get only the security solution cases
          const res = await findCases({
            supertest: supertestWithoutAuth,
            query: {
              severity: CaseSeverity.HIGH,
            },
            auth: {
              user: secOnly,
              space: 'space1',
            },
          });

          // Only security solution cases are being returned
          ensureSavedObjectIsAuthorized(res.cases, 2, ['securitySolutionFixture']);
        });
      });
    });
  });
};
