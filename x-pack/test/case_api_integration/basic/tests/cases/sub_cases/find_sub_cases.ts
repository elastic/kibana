/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findSubCasesResp, postCollectionReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  setStatus,
} from '../../../../common/lib/utils';
import { getSubCasesUrl } from '../../../../../../plugins/cases/common/api/helpers';
import {
  CaseResponse,
  CaseStatuses,
  SubCasesFindResponse,
} from '../../../../../../plugins/cases/common/api';
import { CASES_URL } from '../../../../../../plugins/cases/common/constants';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_sub_cases', () => {
    let actionID: string;
    before(async () => {
      actionID = await createCaseAction(supertest);
    });
    after(async () => {
      await deleteCaseAction(supertest, actionID);
    });
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
};
