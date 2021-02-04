/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findSubCasesResp, postCollectionReq } from '../../../../common/lib/mock';
import { createSubCase, deleteAllCaseItems } from '../../../../common/lib/utils';
import { getSubCasesUrl } from '../../../../../../plugins/case/common/api/helpers';
import {
  CaseResponse,
  CaseStatuses,
  SubCasesFindResponse,
} from '../../../../../../plugins/case/common/api';
import { CASES_URL } from '../../../../../../plugins/case/common/constants';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_sub_cases', () => {
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
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest });

      const { body }: { body: SubCasesFindResponse } = await supertest
        .get(`${getSubCasesUrl(caseInfo.id)}/_find`)
        .expect(200);

      expect(body).to.eql({
        ...findSubCasesResp,
        total: 1,
        // find should not return the comments themselves only the stats
        subCases: [{ ...caseInfo.subCase!, comments: [], totalComment: 1, totalAlerts: 2 }],
        count_open_cases: 1,
      });
    });

    it('should return multiple sub cases', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest });
      const subCase2Resp = await createSubCase({ supertest, caseID: caseInfo.id });

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
            ...subCase2Resp.newSubCaseInfo.subCase,
            comments: [],
            totalComment: 1,
            totalAlerts: 2,
          },
        ],
        count_open_cases: 1,
        count_closed_cases: 1,
      });
    });
  });
};
