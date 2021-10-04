/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../../plugins/security_solution/common/constants';
import {
  CommentsResponse,
  CommentType,
  AttributesTypeUser,
  AttributesTypeAlerts,
} from '../../../../../../plugins/cases/common/api';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  postCollectionReq,
  postCommentGenAlertReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  getCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  removeServerGeneratedPropertiesFromSavedObject,
  superUserSpace1Auth,
} from '../../../../common/lib/utils';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  createRule,
  getQuerySignalIds,
} from '../../../../../detection_engine_api_integration/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('post_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should post a comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const comment = removeServerGeneratedPropertiesFromSavedObject(
          patchedCase.comments![0] as AttributesTypeUser
        );

        expect(comment).to.eql({
          type: postCommentUserReq.type,
          comment: postCommentUserReq.comment,
          associationType: 'case',
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });

      it('should post an alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
        });
        const comment = removeServerGeneratedPropertiesFromSavedObject(
          patchedCase.comments![0] as AttributesTypeAlerts
        );

        expect(comment).to.eql({
          type: postCommentAlertReq.type,
          alertId: postCommentAlertReq.alertId,
          index: postCommentAlertReq.index,
          rule: postCommentAlertReq.rule,
          associationType: 'case',
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });

      it('creates a user action', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const commentUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);

        expect(commentUserAction).to.eql({
          action_field: ['comment'],
          action: 'create',
          action_by: defaultUser,
          new_value: `{"comment":"${postCommentUserReq.comment}","type":"${postCommentUserReq.type}","owner":"securitySolutionFixture"}`,
          new_val_connector_id: null,
          old_value: null,
          old_val_connector_id: null,
          case_id: `${postedCase.id}`,
          comment_id: `${patchedCase.comments![0].id}`,
          sub_case_id: '',
          owner: 'securitySolutionFixture',
        });
      });
    });

    describe('unhappy path', () => {
      it('400s when attempting to create a comment with a different owner than the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolutionFixture' })
        );

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          expectedHttpCode: 400,
        });
      });

      it('400s when type is missing', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            // @ts-expect-error
            bad: 'comment',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when missing attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: {
            type: CommentType.user,
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding excess attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['alertId', 'index']) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: CommentType.user,
              [attribute]: attribute,
              comment: 'a comment',
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when missing attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const allRequestAttributes = {
          type: CommentType.alert,
          index: 'test-index',
          alertId: 'test-id',
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        };

        for (const attribute of ['alertId', 'index']) {
          const requestAttributes = omit(attribute, allRequestAttributes);
          await createComment({
            supertest,
            caseId: postedCase.id,
            // @ts-expect-error
            params: requestAttributes,
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when adding excess attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['comment']) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: CommentType.alert,
              [attribute]: attribute,
              alertId: 'test-id',
              index: 'test-index',
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when case is missing', async () => {
        await createComment({
          supertest,
          caseId: 'not-exists',
          params: {
            // @ts-expect-error
            bad: 'comment',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding an alert to a closed case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

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

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
          expectedHttpCode: 400,
        });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
      it.skip('400s when adding an alert to a collection case', async () => {
        const postedCase = await createCase(supertest, postCollectionReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
          expectedHttpCode: 400,
        });
      });

      it('400s when adding a generated alert to an individual case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send(postCommentGenAlertReq)
          .expect(400);
      });

      it('should return a 400 when passing the subCaseId', async () => {
        const { body } = await supertest
          .post(`${CASES_URL}/case-id/comments?subCaseId=value`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(400);
        expect(body.message).to.contain('subCaseId');
      });
    });

    describe('alerts', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      it('should change the status of the alert if sync alert is on', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const postedCase = await createCase(supertest, postCaseReq);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source?.signal.status).eql('open');

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            owner: 'securitySolutionFixture',
            type: CommentType.alert,
          },
        });

        await es.indices.refresh({ index: alert._index });

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('acknowledged');
      });

      it('should NOT change the status of the alert if sync alert is off', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          settings: { syncAlerts: false },
        });

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source?.signal.status).eql('open');

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            owner: 'securitySolutionFixture',
            type: CommentType.alert,
          },
        });

        await es.indices.refresh({ index: alert._index });

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
      });
    });

    describe('alert format', () => {
      type AlertComment = CommentType.alert | CommentType.generatedAlert;

      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], CommentType.alert],
        [['1', '2'], 'index', CommentType.alert],
        ['1', ['index1', 'index2'], CommentType.generatedAlert],
        [['1', '2'], 'index', CommentType.generatedAlert],
      ]) {
        it(`throws an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: { ...postCommentAlertReq, alertId, index, type: type as AlertComment },
            expectedHttpCode: 400,
          });
        });
      }

      for (const [alertId, index, type] of [
        ['1', ['index1'], CommentType.alert],
        [['1', '2'], ['index', 'other-index'], CommentType.alert],
      ]) {
        it(`does not throw an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              ...postCommentAlertReq,
              alertId,
              index,
              type: type as AlertComment,
            },
            expectedHttpCode: 200,
          });
        });
      }
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub case comments', () => {
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

      it('posts a new comment for a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        // create another sub case just to make sure we get the right comments
        await createSubCase({ supertest, actionID });
        await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const { body: subCaseComments }: { body: CommentsResponse } = await supertest
          .get(`${CASES_URL}/${caseInfo.id}/comments/_find?subCaseId=${caseInfo.subCases![0].id}`)
          .send()
          .expect(200);
        expect(subCaseComments.total).to.be(2);
        expect(subCaseComments.comments[0].type).to.be(CommentType.generatedAlert);
        expect(subCaseComments.comments[1].type).to.be(CommentType.user);
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should create a comment when the user has the correct permissions for that owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('should not create a comment when the user does not have permissions for that owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          { user: obsOnly, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should not create a comment`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should not create a comment in a space the user does not have permissions for', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
