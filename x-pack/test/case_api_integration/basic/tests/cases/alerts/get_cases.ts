/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { postCaseReq, postCommentAlertReq } from '../../../../common/lib/mock';
import { deleteAllCaseItems } from '../../../../common/lib/utils';
import { CaseResponse } from '../../../../../../plugins/cases/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_cases using alertID', () => {
    const createCase = async () => {
      const { body } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);
      return body;
    };

    const createComment = async (caseID: string) => {
      await supertest
        .post(`${CASES_URL}/${caseID}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentAlertReq)
        .expect(200);
    };

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return all cases with the same alert ID attached to them', async () => {
      const [case1, case2, case3] = await Promise.all([createCase(), createCase(), createCase()]);

      await Promise.all([
        createComment(case1.id),
        createComment(case2.id),
        createComment(case3.id),
      ]);

      const { body: caseIDsWithAlert } = await supertest
        .get(`${CASES_URL}/alerts/test-id`)
        .expect(200);

      expect(caseIDsWithAlert.length).to.eql(3);
      expect(caseIDsWithAlert).to.contain(case1.id);
      expect(caseIDsWithAlert).to.contain(case2.id);
      expect(caseIDsWithAlert).to.contain(case3.id);
    });

    it('should return all cases with the same alert ID when more than 100 cases', async () => {
      // if there are more than 100 responses, the implementation sets the aggregation size to the
      // specific value
      const numCases = 102;
      const createCasePromises: Array<Promise<CaseResponse>> = [];
      for (let i = 0; i < numCases; i++) {
        createCasePromises.push(createCase());
      }

      const cases = await Promise.all(createCasePromises);

      const commentPromises: Array<Promise<void>> = [];
      for (const caseInfo of cases) {
        commentPromises.push(createComment(caseInfo.id));
      }

      await Promise.all(commentPromises);

      const { body: caseIDsWithAlert } = await supertest
        .get(`${CASES_URL}/alerts/test-id`)
        .expect(200);

      expect(caseIDsWithAlert.length).to.eql(numCases);

      for (const caseInfo of cases) {
        expect(caseIDsWithAlert).to.contain(caseInfo.id);
      }
    });

    it('should return no cases when the alert ID is not found', async () => {
      const [case1, case2, case3] = await Promise.all([createCase(), createCase(), createCase()]);

      await Promise.all([
        createComment(case1.id),
        createComment(case2.id),
        createComment(case3.id),
      ]);

      const { body: caseIDsWithAlert } = await supertest
        .get(`${CASES_URL}/alerts/test-id100`)
        .expect(200);

      expect(caseIDsWithAlert.length).to.eql(0);
    });

    it('should return a 302 when passing an empty alertID', async () => {
      // kibana returns a 302 instead of a 400 when a url param is missing
      await supertest.get(`${CASES_URL}/alerts/`).expect(302);
    });
  });
};
