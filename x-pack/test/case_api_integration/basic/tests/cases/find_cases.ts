/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertestAsPromised from 'supertest-as-promised';
import { SearchResponse } from 'elasticsearch';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import { postCaseReq, postCommentUserReq, findCasesResp } from '../../../common/lib/mock';
import { deleteAllCaseItems } from '../../../common/lib/utils';
import { CasesFindResponse } from '../../../../../plugins/case/common/api';

interface CaseAttributes {
  cases: {
    title: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  describe.only('find_cases', () => {
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
          // this doesn't guarantee that the cases will be created in order, or example case b, could be created before case
          // a, since we're doing a promise all here
          // a promise all is just much faster than doing it one by one
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
        const cases = await es.search<SearchResponse<CaseAttributes>>({
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
          expect(caseInfo.title).to.eql(allCases[index + perPage].cases.title);
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
              allCases[index + perPage * (currentPage - 1)].cases.title
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
