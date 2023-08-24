/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  Alerts,
  createCaseAttachAlertAndDeleteAlert,
  createSecuritySolutionAlerts,
  getAlertById,
  getSecuritySolutionAlerts,
} from '../../../../common/lib/alerts';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '../../../../../detection_engine_api_integration/utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteComment,
  superUserSpace1Auth,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsOnlyReadAlerts,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlyReadAlerts,
  secSolutionOnlyReadNoIndexAlerts,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should delete a comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const comment = await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: patchedCase.comments![0].id,
        });

        expect(comment).to.eql({});
      });
    });

    describe('unhappy path', () => {
      it('404s when comment belongs to different case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const error = (await deleteComment({
          supertest,
          caseId: 'fake-id',
          commentId: patchedCase.comments![0].id,
          expectedHttpCode: 404,
        })) as Error;

        expect(error.message).to.be(
          `This comment ${patchedCase.comments![0].id} does not exist in fake-id.`
        );
      });

      it('404s when comment is not there', async () => {
        await deleteComment({
          supertest,
          caseId: 'fake-id',
          commentId: 'fake-id',
          expectedHttpCode: 404,
        });
      });
    });

    describe('alerts', () => {
      describe('security_solution', () => {
        let alerts: Alerts = [];

        const getAlerts = async (_alerts: Alerts) => {
          await es.indices.refresh({ index: _alerts.map((alert) => alert._index) });
          const updatedAlerts = await getSecuritySolutionAlerts(
            supertest,
            alerts.map((alert) => alert._id)
          );

          return updatedAlerts.hits.hits.map((alert) => ({ ...alert._source }));
        };

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
          await createSignalsIndex(supertest, log);
          const signals = await createSecuritySolutionAlerts(supertest, log, 2);
          alerts = [signals.hits.hits[0], signals.hits.hits[1]];
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        it('removes a case from the alert schema when deleting an alert attachment', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('should remove only one case', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 3,
            indexOfCaseToDelete: 1,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has write access to the indices and only read access to the siem solution', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 204,
            deleteCommentAuth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 204,
            deleteCommentAuth: { user: obsSec, space: 'space1' },
          });
        });

        it('should delete the case ID from the alert schema when the user has read access to the kibana feature but no read access to the ES index', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 204,
            deleteCommentAuth: { user: secSolutionOnlyReadNoIndexAlerts, space: 'space1' },
          });
        });
      });

      describe('observability', () => {
        const alerts = [
          { _id: 'NoxgpHkBqbdrfX07MqXV', _index: '.alerts-observability.apm.alerts' },
          { _id: 'space1alert', _index: '.alerts-observability.apm.alerts' },
        ];

        const getAlerts = async (_alerts: Alerts) => {
          await es.indices.refresh({ index: '.alerts-observability.apm.alerts' });
          const updatedAlerts = await Promise.all(
            _alerts.map((alert) =>
              getAlertById({
                supertest: supertestWithoutAuth,
                id: alert._id,
                index: alert._index,
                auth: { user: superUser, space: 'space1' },
              })
            )
          );

          return updatedAlerts as Array<Record<string, unknown>>;
        };

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
        });

        it('removes a case from the alert schema when deleting an alert attachment', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('should remove only one case', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 3,
            indexOfCaseToDelete: 1,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has read access only', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            expectedHttpCode: 204,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
            deleteCommentAuth: { user: obsOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indexOfCaseToDelete: 0,
            expectedHttpCode: 204,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
            deleteCommentAuth: { user: obsSec, space: 'space1' },
          });
        });
      });
    });

    describe('rbac', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should delete a comment from the appropriate owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('should not delete a comment from a different owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT delete a comment`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const commentResp = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await deleteComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            commentId: commentResp.comments![0].id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT delete a comment in a space with where the user does not have permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });

      it('should NOT delete a comment created in space2 by making a request to space1', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
