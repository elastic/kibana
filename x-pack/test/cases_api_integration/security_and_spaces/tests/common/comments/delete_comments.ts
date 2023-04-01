/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CommentType } from '@kbn/cases-plugin/common';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import {
  createSecuritySolutionAlerts,
  getAlertById,
  getSecuritySolutionAlerts,
} from '../../../../common/lib/alerts';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllRules,
} from '../../../../../detection_engine_api_integration/utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { User } from '../../../../common/lib/authentication/types';

import { getPostCaseRequest, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteAllComments,
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

  describe('delete_comments', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should delete all comments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });

        const comment = await deleteAllComments({
          supertest,
          caseId: postedCase.id,
        });

        expect(comment).to.eql({});
      });
    });

    describe('unhappy path', () => {
      it('404s when comment belongs to different case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });

        const error = (await deleteAllComments({
          supertest,
          caseId: 'fake-id',
          expectedHttpCode: 404,
        })) as Error;

        expect(error.message).to.be('No comments found for fake-id.');
      });
    });

    describe('alerts', () => {
      type Alerts = Array<{ _id: string; _index: string }>;

      const createCaseAttachAlertAndDeleteAlert = async ({
        totalCases,
        indexOfCaseToDelete,
        owner,
        expectedHttpCode = 204,
        deleteCommentAuth = { user: superUser, space: 'space1' },
        alerts,
        getAlerts,
      }: {
        totalCases: number;
        indexOfCaseToDelete: number;
        owner: string;
        expectedHttpCode?: number;
        deleteCommentAuth?: { user: User; space: string | null };
        alerts: Alerts;
        getAlerts: (alerts: Alerts) => Promise<Array<Record<string, unknown>>>;
      }) => {
        const cases = await Promise.all(
          [...Array(totalCases).keys()].map((index) =>
            createCase(
              supertestWithoutAuth,
              {
                ...postCaseReq,
                owner,
                settings: { syncAlerts: false },
              },
              200,
              { user: superUser, space: 'space1' }
            )
          )
        );

        const updatedCases = [];

        for (const theCase of cases) {
          const updatedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: theCase.id,
            params: {
              alertId: alerts.map((alert) => alert._id),
              index: alerts.map((alert) => alert._index),
              rule: {
                id: 'id',
                name: 'name',
              },
              owner,
              type: CommentType.alert,
            },
            auth: { user: superUser, space: 'space1' },
          });

          updatedCases.push(updatedCase);
        }

        const caseIds = updatedCases.map((theCase) => theCase.id);

        const updatedAlerts = await getAlerts(alerts);

        for (const alert of updatedAlerts) {
          expect(alert[ALERT_CASE_IDS]).eql(caseIds);
        }

        const caseToDelete = updatedCases[indexOfCaseToDelete];

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: caseToDelete.id,
          expectedHttpCode,
          auth: deleteCommentAuth,
        });

        const alertAfterDeletion = await getAlerts(alerts);

        const caseIdsWithoutRemovedCase =
          expectedHttpCode === 204
            ? updatedCases
                .filter((theCase) => theCase.id !== caseToDelete.id)
                .map((theCase) => theCase.id)
            : updatedCases.map((theCase) => theCase.id);

        for (const alert of alertAfterDeletion) {
          expect(alert[ALERT_CASE_IDS]).eql(caseIdsWithoutRemovedCase);
        }
      };

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
          const signals = await createSecuritySolutionAlerts(supertest, log);
          alerts = [signals.hits.hits[0], signals.hits.hits[1]];
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest, log);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        it('removes a case from the alert schema when deleting all alert attachments', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('should remove only one case', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 3,
            indexOfCaseToDelete: 1,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has write access to the indices and only read access to the siem solution', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 204,
            deleteCommentAuth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should NOT delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 403,
            deleteCommentAuth: { user: obsSec, space: 'space1' },
          });
        });

        it('should delete the case ID from the alert schema when the user has read access to the kibana feature but no read access to the ES index', async () => {
          await createCaseAttachAlertAndDeleteAlert({
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

        it('removes a case from the alert schema when deleting all alert attachments', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('should remove only one case', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 3,
            indexOfCaseToDelete: 1,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has read access only', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            expectedHttpCode: 204,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
            deleteCommentAuth: { user: obsOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should NOT delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteAlert({
            totalCases: 1,
            indexOfCaseToDelete: 0,
            expectedHttpCode: 403,
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

      it('should delete multiple comments from the appropriate owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
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

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT delete all comments`, async () => {
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
            auth: superUserSpace1Auth,
          });

          await deleteAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
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

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
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

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
