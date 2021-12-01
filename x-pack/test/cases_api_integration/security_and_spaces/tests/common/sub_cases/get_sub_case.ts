/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { commentsResp, postCommentAlertReq, subCaseResp } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  defaultCreateSubComment,
  deleteAllCaseItems,
  deleteCaseAction,
  removeServerGeneratedPropertiesFromComments,
  removeServerGeneratedPropertiesFromSubCase,
} from '../../../../common/lib/utils';
import {
  getCaseCommentsUrl,
  getSubCaseDetailsUrl,
} from '../../../../../../plugins/cases/common/api/helpers';
import {
  AssociationType,
  CaseResponse,
  SubCaseResponse,
} from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // ENABLE_CASE_CONNECTOR: remove the outer describe once the case connector feature is completed
  describe('get_sub_case disabled route', () => {
    it('should return a 404 when attempting to access the route and the case connector feature is disabled', async () => {
      await supertest.get(getSubCaseDetailsUrl('case-id', 'sub-case-id')).expect(404);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('get_sub_case', () => {
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

      it('should return a case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

        const { body }: { body: SubCaseResponse } = await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCases![0].id))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(removeServerGeneratedPropertiesFromComments(body.comments)).to.eql(
          commentsResp({
            comments: [{ comment: defaultCreateSubComment, id: caseInfo.comments![0].id }],
            associationType: AssociationType.subCase,
          })
        );

        expect(removeServerGeneratedPropertiesFromSubCase(body)).to.eql(
          subCaseResp({ id: body.id, totalComment: 1, totalAlerts: 2 })
        );
      });

      it('should return the correct number of alerts with multiple types of alerts', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

        const { body: singleAlert }: { body: CaseResponse } = await supertest
          .post(getCaseCommentsUrl(caseInfo.id))
          .query({ subCaseId: caseInfo.subCases![0].id })
          .set('kbn-xsrf', 'true')
          .send(postCommentAlertReq)
          .expect(200);

        const { body }: { body: SubCaseResponse } = await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCases![0].id))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(removeServerGeneratedPropertiesFromComments(body.comments)).to.eql(
          commentsResp({
            comments: [
              { comment: defaultCreateSubComment, id: caseInfo.comments![0].id },
              {
                comment: postCommentAlertReq,
                id: singleAlert.comments![1].id,
              },
            ],
            associationType: AssociationType.subCase,
          })
        );

        expect(removeServerGeneratedPropertiesFromSubCase(body)).to.eql(
          subCaseResp({ id: body.id, totalComment: 2, totalAlerts: 3 })
        );
      });

      it('unhappy path - 404s when case is not there', async () => {
        await supertest
          .get(getSubCaseDetailsUrl('fake-case-id', 'fake-sub-case-id'))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(404);
      });
    });
  });
};
