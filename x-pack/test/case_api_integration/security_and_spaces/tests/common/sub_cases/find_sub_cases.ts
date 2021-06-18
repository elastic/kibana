/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApiResponse, estypes } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findSubCasesResp, postCollectionReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  CreateSubCaseResp,
  deleteAllCaseItems,
  deleteCaseAction,
  setStatus,
} from '../../../../common/lib/utils';
import { getSubCasesUrl } from '../../../../../../plugins/cases/common/api/helpers';
import {
  CaseResponse,
  CaseStatuses,
  CommentType,
  SubCasesFindResponse,
} from '../../../../../../plugins/cases/common/api';
import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  ContextTypeGeneratedAlertType,
  createAlertsString,
} from '../../../../../../plugins/cases/server/connectors';

interface SubCaseAttributes {
  'cases-sub-case': {
    created_at: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // ENABLE_CASE_CONNECTOR: remove this outer describe once the case connector feature is completed
  describe('find_sub_cases disabled route', () => {
    it('should return a 404 when attempting to access the route and the case connector feature is disabled', async () => {
      await supertest.get(`${getSubCasesUrl('case-id')}/_find`).expect(404);
    });

    // ENABLE_CASE_CONNECTOR: enable these tests once the case connector feature is completed
    describe.skip('create case connector', () => {
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction(supertest);
      });
      after(async () => {
        await deleteCaseAction(supertest, actionID);
      });

      describe('basic find tests', () => {
        afterEach(async () => {
          await deleteAllCaseItems(es);
        });
        it('should not find any sub cases when none exist', async () => {
          const { body: caseResp }: { body: CaseResponse } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send(postCollectionReq)
            .expect(200);

          const { body: findSubCases } = await supertest
            .get(`${getSubCasesUrl(caseResp.id)}/_find`)
            .expect(200);

          expect(findSubCases).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            subCases: [],
            count_open_cases: 0,
            count_closed_cases: 0,
            count_in_progress_cases: 0,
          });
        });

        it('should return a sub cases with comment stats', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find`)
            .expect(200);

          expect(body).to.eql({
            ...findSubCasesResp,
            total: 1,
            // find should not return the comments themselves only the stats
            subCases: [{ ...caseInfo.subCases![0], comments: [], totalComment: 1, totalAlerts: 2 }],
            count_open_cases: 1,
          });
        });

        it('should return multiple sub cases', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          const subCase2Resp = await createSubCase({ supertest, caseID: caseInfo.id, actionID });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find`)
            .expect(200);

          expect(body).to.eql({
            ...findSubCasesResp,
            total: 2,
            // find should not return the comments themselves only the stats
            subCases: [
              {
                // there should only be 1 closed sub case
                ...subCase2Resp.modifiedSubCases![0],
                comments: [],
                totalComment: 1,
                totalAlerts: 2,
                status: CaseStatuses.closed,
              },
              {
                ...subCase2Resp.newSubCaseInfo.subCases![0],
                comments: [],
                totalComment: 1,
                totalAlerts: 2,
              },
            ],
            count_open_cases: 1,
            count_closed_cases: 1,
          });
        });

        it('should only return open when filtering for open', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          await createSubCase({ supertest, caseID: caseInfo.id, actionID });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?status=${CaseStatuses.open}`)
            .expect(200);

          expect(body.total).to.be(1);
          expect(body.subCases[0].status).to.be(CaseStatuses.open);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(1);
          expect(body.count_in_progress_cases).to.be(0);
        });

        it('should only return closed when filtering for closed', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          await createSubCase({ supertest, caseID: caseInfo.id, actionID });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?status=${CaseStatuses.closed}`)
            .expect(200);

          expect(body.total).to.be(1);
          expect(body.subCases[0].status).to.be(CaseStatuses.closed);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(1);
          expect(body.count_in_progress_cases).to.be(0);
        });

        it('should only return in progress when filtering for in progress', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          const { newSubCaseInfo: secondSub } = await createSubCase({
            supertest,
            caseID: caseInfo.id,
            actionID,
          });

          await setStatus({
            supertest,
            cases: [
              {
                id: secondSub.subCases![0].id,
                version: secondSub.subCases![0].version,
                status: CaseStatuses['in-progress'],
              },
            ],
            type: 'sub_case',
          });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?status=${CaseStatuses['in-progress']}`)
            .expect(200);

          expect(body.total).to.be(1);
          expect(body.subCases[0].status).to.be(CaseStatuses['in-progress']);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(0);
          expect(body.count_in_progress_cases).to.be(1);
        });

        it('should sort on createdAt field in descending order', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          await createSubCase({
            supertest,
            caseID: caseInfo.id,
            actionID,
          });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?sortField=createdAt&sortOrder=desc`)
            .expect(200);

          expect(body.total).to.be(2);
          expect(body.subCases[0].status).to.be(CaseStatuses.open);
          expect(body.subCases[1].status).to.be(CaseStatuses.closed);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(1);
          expect(body.count_in_progress_cases).to.be(0);
        });

        it('should sort on createdAt field in ascending order', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          await createSubCase({
            supertest,
            caseID: caseInfo.id,
            actionID,
          });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?sortField=createdAt&sortOrder=asc`)
            .expect(200);

          expect(body.total).to.be(2);
          expect(body.subCases[0].status).to.be(CaseStatuses.closed);
          expect(body.subCases[1].status).to.be(CaseStatuses.open);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(1);
          expect(body.count_in_progress_cases).to.be(0);
        });

        it('should sort on updatedAt field in ascending order', async () => {
          const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
          // this will result in one closed case and one open
          const { newSubCaseInfo: secondSub } = await createSubCase({
            supertest,
            caseID: caseInfo.id,
            actionID,
          });

          await setStatus({
            supertest,
            cases: [
              {
                id: secondSub.subCases![0].id,
                version: secondSub.subCases![0].version,
                status: CaseStatuses['in-progress'],
              },
            ],
            type: 'sub_case',
          });

          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(caseInfo.id)}/_find?sortField=updatedAt&sortOrder=asc`)
            .expect(200);

          expect(body.total).to.be(2);
          expect(body.subCases[0].status).to.be(CaseStatuses.closed);
          expect(body.subCases[1].status).to.be(CaseStatuses['in-progress']);
          expect(body.count_closed_cases).to.be(1);
          expect(body.count_open_cases).to.be(0);
          expect(body.count_in_progress_cases).to.be(1);
        });
      });

      describe('pagination', () => {
        const numCases = 4;
        let collection: CaseResponse;
        before(async () => {
          ({ body: collection } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send(postCollectionReq)
            .expect(200));

          await createSubCases(numCases, collection.id);
        });

        after(async () => {
          await deleteAllCaseItems(es);
        });

        const createSubCases = async (total: number, caseID: string) => {
          const responses: CreateSubCaseResp[] = [];
          for (let i = 0; i < total; i++) {
            const postCommentGenAlertReq: ContextTypeGeneratedAlertType = {
              alerts: createAlertsString([
                { _id: `${i}`, _index: 'test-index', ruleId: 'rule-id', ruleName: 'rule name' },
              ]),
              type: CommentType.generatedAlert,
              owner: 'securitySolutionFixture',
            };
            responses.push(
              await createSubCase({
                supertest,
                actionID,
                caseID,
                comment: postCommentGenAlertReq,
              })
            );
          }
          return responses;
        };

        const getAllCasesSortedByCreatedAtAsc = async () => {
          const cases: ApiResponse<estypes.SearchResponse<SubCaseAttributes>> = await es.search({
            index: '.kibana',
            body: {
              size: 10000,
              sort: [{ 'cases-sub-case.created_at': { unmapped_type: 'date', order: 'asc' } }],
              query: {
                term: { type: 'cases-sub-case' },
              },
            },
          });
          return cases.body.hits.hits.map((hit) => hit._source);
        };

        it('returns the correct total when perPage is less than the total', async () => {
          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(collection.id)}/_find`)
            .query({
              sortOrder: 'asc',
              page: 1,
              perPage: 3,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.subCases.length).to.eql(3);
          expect(body.total).to.eql(4);
          expect(body.page).to.eql(1);
          expect(body.per_page).to.eql(3);
          // there will only be 1 open sub case, all the rest will be closed
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_closed_cases).to.eql(3);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('returns the correct total when perPage is greater than the total', async () => {
          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(collection.id)}/_find`)
            .query({
              sortOrder: 'asc',
              page: 1,
              perPage: 11,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.total).to.eql(4);
          expect(body.page).to.eql(1);
          expect(body.per_page).to.eql(11);
          expect(body.subCases.length).to.eql(4);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_closed_cases).to.eql(3);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('returns the correct total when perPage is equal to the total', async () => {
          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(collection.id)}/_find`)
            .query({
              sortOrder: 'asc',
              page: 1,
              perPage: 4,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.total).to.eql(4);
          expect(body.page).to.eql(1);
          expect(body.per_page).to.eql(4);
          expect(body.subCases.length).to.eql(4);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_closed_cases).to.eql(3);
          expect(body.count_in_progress_cases).to.eql(0);
        });

        it('returns the second page of results', async () => {
          const perPage = 2;
          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(collection.id)}/_find`)
            .query({
              sortOrder: 'asc',
              page: 2,
              perPage,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.total).to.eql(4);
          expect(body.page).to.eql(2);
          expect(body.per_page).to.eql(2);
          expect(body.subCases.length).to.eql(2);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_closed_cases).to.eql(3);
          expect(body.count_in_progress_cases).to.eql(0);

          const allCases = await getAllCasesSortedByCreatedAtAsc();

          body.subCases.map((subCaseInfo, index) => {
            // we started on the second page of 10 cases with a perPage of 5, so the first case should 0 + 5 (index + perPage)
            expect(subCaseInfo.created_at).to.eql(
              allCases[index + perPage]?.['cases-sub-case'].created_at
            );
          });
        });

        it('paginates with perPage of 2 through 4 total sub cases', async () => {
          const total = 4;
          const perPage = 2;

          // it's less than or equal here because the page starts at 1, so page 2 is a valid page number
          // and should have sub cases titles 3, and 4
          for (let currentPage = 1; currentPage <= total / perPage; currentPage++) {
            const { body }: { body: SubCasesFindResponse } = await supertest
              .get(`${getSubCasesUrl(collection.id)}/_find`)
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
            expect(body.subCases.length).to.eql(perPage);
            expect(body.count_open_cases).to.eql(1);
            expect(body.count_closed_cases).to.eql(total - 1);
            expect(body.count_in_progress_cases).to.eql(0);

            const allCases = await getAllCasesSortedByCreatedAtAsc();

            body.subCases.map((subCaseInfo, index) => {
              // for page 1, the cases tiles should be 0,1,2 for page 2: 3,4,5 etc (assuming the titles were sorted
              // correctly)
              expect(subCaseInfo.created_at).to.eql(
                allCases[index + perPage * (currentPage - 1)]?.['cases-sub-case'].created_at
              );
            });
          }
        });

        it('retrieves the last sub case', async () => {
          const { body }: { body: SubCasesFindResponse } = await supertest
            .get(`${getSubCasesUrl(collection.id)}/_find`)
            .query({
              sortOrder: 'asc',
              // this should skip the first 3 sub cases and only return the last one
              page: 2,
              perPage: 3,
            })
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(body.total).to.eql(4);
          expect(body.page).to.eql(2);
          expect(body.per_page).to.eql(3);
          expect(body.subCases.length).to.eql(1);
          expect(body.count_open_cases).to.eql(1);
          expect(body.count_closed_cases).to.eql(3);
          expect(body.count_in_progress_cases).to.eql(0);
        });
      });
    });
  });
};
