/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApiResponse, estypes } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  CASES_URL,
  SUB_CASES_PATCH_DEL_URL,
} from '../../../../../../plugins/cases/common/constants';
import {
  postCaseReq,
  postCommentUserReq,
  findCasesResp,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createSubCase,
  setStatus,
  CreateSubCaseResp,
  createCaseAction,
  deleteCaseAction,
  ensureSavedObjectIsAuthorized,
  findCases,
  createCase,
  updateCase,
  createComment,
} from '../../../../common/lib/utils';
import { CaseResponse, CaseStatuses, CaseType } from '../../../../../../plugins/cases/common/api';
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

      it('unhappy path - 400s when bad query supplied', async () => {
        await findCases({ supertest, query: { perPage: true }, expectedHttpCode: 400 });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
      describe.skip('stats with sub cases', () => {
        let collection: CreateSubCaseResp;
        let actionID: string;
        before(async () => {
          actionID = await createCaseAction(supertest);
        });
        after(async () => {
          await deleteCaseAction(supertest, actionID);
        });
        beforeEach(async () => {
          // create a collection with a sub case that is marked as open
          collection = await createSubCase({ supertest, actionID });

          const [, , { body: toCloseCase }] = await Promise.all([
            // set the sub case to in-progress
            setStatus({
              supertest,
              cases: [
                {
                  id: collection.newSubCaseInfo.subCases![0].id,
                  version: collection.newSubCaseInfo.subCases![0].version,
                  status: CaseStatuses['in-progress'],
                },
              ],
              type: 'sub_case',
            }),
            // create two cases that are both open
            supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq),
            supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq),
          ]);

          // set the third case to closed
          await setStatus({
            supertest,
            cases: [
              {
                id: toCloseCase.id,
                version: toCloseCase.version,
                status: CaseStatuses.closed,
              },
            ],
            type: 'case',
          });
        });
        it('correctly counts stats without using a filter', async () => {
          const cases = await findCases({ supertest });

          expect(cases.total).to.eql(3);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(1);
        });

        it('correctly counts stats with a filter for open cases', async () => {
          const cases = await findCases({ supertest, query: { status: CaseStatuses.open } });

          expect(cases.cases.length).to.eql(1);

          // since we're filtering on status and the collection only has an in-progress case, it should only return the
          // individual case that has the open status and no collections
          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes a collection
          // that does not have an open case. This is a known issue and will need to be resolved
          // when this issue is addressed: https://github.com/elastic/kibana/issues/94115
          expect(cases.total).to.eql(2);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(1);
        });

        it('correctly counts stats with a filter for individual cases', async () => {
          const cases = await findCases({ supertest, query: { type: CaseType.individual } });

          expect(cases.total).to.eql(2);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats with a filter for collection cases with multiple sub cases', async () => {
          // this will force the first sub case attached to the collection to be closed
          // so we'll have one closed sub case and one open sub case
          await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
          const cases = await findCases({ supertest, query: { type: CaseType.collection } });

          expect(cases.total).to.eql(1);
          expect(cases.cases[0].subCases?.length).to.eql(2);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats with a filter for collection and open cases with multiple sub cases', async () => {
          // this will force the first sub case attached to the collection to be closed
          // so we'll have one closed sub case and one open sub case
          await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
          const cases = await findCases({
            supertest,
            query: {
              type: CaseType.collection,
              status: CaseStatuses.open,
            },
          });

          expect(cases.total).to.eql(1);
          expect(cases.cases[0].subCases?.length).to.eql(1);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats including a collection without sub cases when not filtering on status', async () => {
          // delete the sub case on the collection so that it doesn't have any sub cases
          await supertest
            .delete(
              `${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`
            )
            .set('kbn-xsrf', 'true')
            .send()
            .expect(204);

          const cases = await findCases({ supertest, query: { type: CaseType.collection } });

          // it should include the collection without sub cases because we did not pass in a filter on status
          expect(cases.total).to.eql(3);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats including a collection without sub cases when filtering on tags', async () => {
          // delete the sub case on the collection so that it doesn't have any sub cases
          await supertest
            .delete(
              `${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`
            )
            .set('kbn-xsrf', 'true')
            .send()
            .expect(204);

          const cases = await findCases({ supertest, query: { tags: ['defacement'] } });

          // it should include the collection without sub cases because we did not pass in a filter on status
          expect(cases.total).to.eql(3);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
        });

        it('does not return collections without sub cases matching the requested status', async () => {
          const cases = await findCases({ supertest, query: { status: CaseStatuses.closed } });

          expect(cases.cases.length).to.eql(1);
          // it should not include the collection that has a sub case as in-progress
          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes collections. This short term
          // fix for when sub cases are not enabled. When the feature is completed the _find API
          // will need to be fixed as explained in this ticket: https://github.com/elastic/kibana/issues/94115
          expect(cases.total).to.eql(2);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(1);
        });

        it('does not return empty collections when filtering on status', async () => {
          // delete the sub case on the collection so that it doesn't have any sub cases
          await supertest
            .delete(
              `${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`
            )
            .set('kbn-xsrf', 'true')
            .send()
            .expect(204);

          const cases = await findCases({ supertest, query: { status: CaseStatuses.closed } });

          expect(cases.cases.length).to.eql(1);

          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes collections. This short term
          // fix for when sub cases are not enabled. When the feature is completed the _find API
          // will need to be fixed as explained in this ticket: https://github.com/elastic/kibana/issues/94115
          expect(cases.total).to.eql(2);
          expect(cases.count_closed_cases).to.eql(1);
          expect(cases.count_open_cases).to.eql(1);
          expect(cases.count_in_progress_cases).to.eql(0);
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
        const cases: ApiResponse<estypes.SearchResponse<CaseAttributes>> = await es.search({
          index: '.kibana',
          body: {
            size: 10000,
            sort: [{ 'cases.created_at': { unmapped_type: 'date', order: 'asc' } }],
            query: {
              term: { type: 'cases' },
            },
          },
        });
        return cases.body.hits.hits.map((hit) => hit._source);
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
    });
  });
};
