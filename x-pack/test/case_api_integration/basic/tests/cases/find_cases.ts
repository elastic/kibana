/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertestAsPromised from 'supertest-as-promised';
import type { ApiResponse, estypes } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL, SUB_CASES_PATCH_DEL_URL } from '../../../../../plugins/cases/common/constants';
import { postCaseReq, postCommentUserReq, findCasesResp } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createSubCase,
  setStatus,
  CreateSubCaseResp,
  createCaseAction,
  deleteCaseAction,
} from '../../../common/lib/utils';
import { CasesFindResponse, CaseStatuses, CaseType } from '../../../../../plugins/cases/common/api';

interface CaseAttributes {
  cases: {
    title: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  describe('find_cases', () => {
    describe('basic tests', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return empty response', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql(findCasesResp);
      });

      it('should return cases', async () => {
        const { body: a } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const { body: b } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const { body: c } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql({
          ...findCasesResp,
          total: 3,
          cases: [a, b, c],
          count_open_cases: 3,
        });
      });

      it('filters by tags', async () => {
        await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...postCaseReq, tags: ['unique'] })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&tags=unique`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('filters by status', async () => {
        const { body: openCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq);

        const { body: toCloseCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: toCloseCase.id,
                version: toCloseCase.version,
                status: 'closed',
              },
            ],
          })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&status=open`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [openCase],
          count_open_cases: 1,
          count_closed_cases: 1,
          count_in_progress_cases: 0,
        });
      });

      it('filters by reporters', async () => {
        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&reporters=elastic`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('correctly counts comments', async () => {
        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        // post 2 comments
        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const { body: patchedCase } = await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).to.eql({
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
        await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);

        const { body: inProgreeCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: 'closed',
              },
            ],
          })
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: inProgreeCase.id,
                version: inProgreeCase.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.count_open_cases).to.eql(1);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(1);
      });

      it('unhappy path - 400s when bad query supplied', async () => {
        await supertest
          .get(`${CASES_URL}/_find?perPage=true`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
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
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc`)
            .expect(200);

          expect(body.total).to.eql(3);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(1);
        });

        it('correctly counts stats with a filter for open cases', async () => {
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&status=open`)
            .expect(200);

          expect(body.cases.length).to.eql(1);

          // since we're filtering on status and the collection only has an in-progress case, it should only return the
          // individual case that has the open status and no collections
          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes a collection
          // that does not have an open case. This is a known issue and will need to be resolved
          // when this issue is addressed: https://github.com/elastic/kibana/issues/94115
          expect(body.total).to.eql(2);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(1);
        });

        it('correctly counts stats with a filter for individual cases', async () => {
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&type=${CaseType.individual}`)
            .expect(200);

          expect(body.total).to.eql(2);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats with a filter for collection cases with multiple sub cases', async () => {
          // this will force the first sub case attached to the collection to be closed
          // so we'll have one closed sub case and one open sub case
          await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&type=${CaseType.collection}`)
            .expect(200);

          expect(body.total).to.eql(1);
          expect(body.cases[0].subCases?.length).to.eql(2);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('correctly counts stats with a filter for collection and open cases with multiple sub cases', async () => {
          // this will force the first sub case attached to the collection to be closed
          // so we'll have one closed sub case and one open sub case
          await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
          const { body }: { body: CasesFindResponse } = await supertest
            .get(
              `${CASES_URL}/_find?sortOrder=asc&type=${CaseType.collection}&status=${CaseStatuses.open}`
            )
            .expect(200);

          expect(body.total).to.eql(1);
          expect(body.cases[0].subCases?.length).to.eql(1);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
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

          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc`)
            .expect(200);

          // it should include the collection without sub cases because we did not pass in a filter on status
          expect(body.total).to.eql(3);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
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

          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&tags=defacement`)
            .expect(200);

          // it should include the collection without sub cases because we did not pass in a filter on status
          expect(body.total).to.eql(3);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('does not return collections without sub cases matching the requested status', async () => {
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&status=closed`)
            .expect(200);

          expect(body.cases.length).to.eql(1);
          // it should not include the collection that has a sub case as in-progress
          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes collections. This short term
          // fix for when sub cases are not enabled. When the feature is completed the _find API
          // will need to be fixed as explained in this ticket: https://github.com/elastic/kibana/issues/94115
          expect(body.total).to.eql(2);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(1);
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

          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find?sortOrder=asc&status=closed`)
            .expect(200);

          expect(body.cases.length).to.eql(1);

          // ENABLE_CASE_CONNECTOR: this value is not correct because it includes collections. This short term
          // fix for when sub cases are not enabled. When the feature is completed the _find API
          // will need to be fixed as explained in this ticket: https://github.com/elastic/kibana/issues/94115
          expect(body.total).to.eql(2);
          expect(body.count_closed_cases).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_in_progress_cases).to.eql(0);
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

      const createCasesWithTitleAsNumber = async (total: number) => {
        const responsePromises: supertestAsPromised.Test[] = [];
        for (let i = 0; i < total; i++) {
          // this doesn't guarantee that the cases will be created in order that the for-loop executes,
          // for example case with title '2', could be created before the case with title '1' since we're doing a promise all here
          // A promise all is just much faster than doing it one by one which would have guaranteed that the cases are
          // created in the order that the for-loop executes
          responsePromises.push(
            supertest
              .post(CASES_URL)
              .set('kbn-xsrf', 'true')
              .send({ ...postCaseReq, title: `${i}` })
          );
        }
        const responses = await Promise.all(responsePromises);
        return responses.map((response) => response.body);
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
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find`)
          .query({
            sortOrder: 'asc',
            page: 1,
            perPage: 5,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.cases.length).to.eql(5);
        expect(body.total).to.eql(10);
        expect(body.page).to.eql(1);
        expect(body.per_page).to.eql(5);
        expect(body.count_open_cases).to.eql(10);
        expect(body.count_closed_cases).to.eql(0);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('returns the correct total when perPage is greater than the total', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find`)
          .query({
            sortOrder: 'asc',
            page: 1,
            perPage: 11,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.total).to.eql(10);
        expect(body.page).to.eql(1);
        expect(body.per_page).to.eql(11);
        expect(body.cases.length).to.eql(10);
        expect(body.count_open_cases).to.eql(10);
        expect(body.count_closed_cases).to.eql(0);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('returns the correct total when perPage is equal to the total', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find`)
          .query({
            sortOrder: 'asc',
            page: 1,
            perPage: 10,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.total).to.eql(10);
        expect(body.page).to.eql(1);
        expect(body.per_page).to.eql(10);
        expect(body.cases.length).to.eql(10);
        expect(body.count_open_cases).to.eql(10);
        expect(body.count_closed_cases).to.eql(0);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('returns the second page of results', async () => {
        const perPage = 5;
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find`)
          .query({
            sortOrder: 'asc',
            page: 2,
            perPage,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.total).to.eql(10);
        expect(body.page).to.eql(2);
        expect(body.per_page).to.eql(5);
        expect(body.cases.length).to.eql(5);
        expect(body.count_open_cases).to.eql(10);
        expect(body.count_closed_cases).to.eql(0);
        expect(body.count_in_progress_cases).to.eql(0);

        const allCases = await getAllCasesSortedByCreatedAtAsc();

        body.cases.map((caseInfo, index) => {
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
          const { body }: { body: CasesFindResponse } = await supertest
            .get(`${CASES_URL}/_find`)
            .query({
              sortOrder: 'asc',
              page: currentPage,
              perPage,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.total).to.eql(total);
          expect(body.page).to.eql(currentPage);
          expect(body.per_page).to.eql(perPage);
          expect(body.cases.length).to.eql(perPage);
          expect(body.count_open_cases).to.eql(total);
          expect(body.count_closed_cases).to.eql(0);
          expect(body.count_in_progress_cases).to.eql(0);

          const allCases = await getAllCasesSortedByCreatedAtAsc();

          body.cases.map((caseInfo, index) => {
            // for page 1, the cases tiles should be 0,1,2 for page 2: 3,4,5 etc (assuming the titles were sorted
            // correctly)
            expect(caseInfo.title).to.eql(
              allCases[index + perPage * (currentPage - 1)]?.cases.title
            );
          });
        }
      });

      it('retrieves the last three cases', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find`)
          .query({
            sortOrder: 'asc',
            // this should skip the first 7 cases and only return the last 3
            page: 2,
            perPage: 7,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.total).to.eql(10);
        expect(body.page).to.eql(2);
        expect(body.per_page).to.eql(7);
        expect(body.cases.length).to.eql(3);
        expect(body.count_open_cases).to.eql(10);
        expect(body.count_closed_cases).to.eql(0);
        expect(body.count_in_progress_cases).to.eql(0);
      });
    });
  });
};
