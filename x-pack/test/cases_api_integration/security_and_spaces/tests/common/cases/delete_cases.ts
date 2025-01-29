/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import { MAX_COMMENTS_PER_PAGE } from '@kbn/cases-plugin/common/constants';
import {
  Alerts,
  createCaseAttachAlertAndDeleteCase,
  createSecuritySolutionAlerts,
  getAlertById,
  getSecuritySolutionAlerts,
} from '../../../../common/lib/alerts';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getFilesAttachmentReq,
  getPostCaseRequest,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  createCase,
  deleteCases,
  createComment,
  getComment,
  getCase,
  superUserSpace1Auth,
  findCaseUserActions,
  deleteAllCaseItems,
  createAndUploadFile,
  deleteAllFiles,
  listFiles,
  findAttachments,
  bulkCreateAttachments,
  getAllComments,
} from '../../../../common/lib/api';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  obsOnly,
  superUser,
  obsOnlyReadAlerts,
  obsSec,
  secSolutionOnlyReadNoIndexAlerts,
  secOnlyReadAlerts,
} from '../../../../common/lib/authentication/users';
import {
  secAllUser,
  users as api_int_users,
} from '../../../../../api_integration/apis/cases/common/users';
import { roles as api_int_roles } from '../../../../../api_integration/apis/cases/common/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import {
  OBSERVABILITY_FILE_KIND,
  SECURITY_SOLUTION_FILE_KIND,
} from '../../../../common/lib/constants';
import { User } from '../../../../common/lib/authentication/types';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../common/utils/security_solution';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('delete_cases', () => {
    afterEach(async () => {
      await deleteAllFiles({
        supertest,
      });
      await deleteAllCaseItems(es);
    });

    it('should delete a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const body = await deleteCases({ supertest, caseIDs: [postedCase.id] });

      expect(body).to.eql({});
    });

    it('should delete multiple cases and their user actions', async () => {
      const [case1, case2] = await Promise.all([
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
      ]);

      await deleteCases({ supertest, caseIDs: [case1.id, case2.id] });

      await findCaseUserActions({
        supertest,
        caseID: case1.id,
        expectedHttpCode: 404,
      });

      await findCaseUserActions({
        supertest,
        caseID: case2.id,
        expectedHttpCode: 404,
      });
    });

    it(`should delete a case's comments and user actions when that case gets deleted`, async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      // ensure that we can get the comment before deleting the case
      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: patchedCase.comments![0].id,
      });

      await deleteCases({ supertest, caseIDs: [postedCase.id] });

      // make sure the comment is now gone
      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: patchedCase.comments![0].id,
        expectedHttpCode: 404,
      });

      await findCaseUserActions({ supertest, caseID: postedCase.id, expectedHttpCode: 404 });
    });

    it('should delete all user actions when deleting a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await deleteCases({ supertest, caseIDs: [postedCase.id] });
      await findCaseUserActions({ supertest, caseID: postedCase.id, expectedHttpCode: 404 });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await deleteCases({ supertest, caseIDs: ['fake-id'], expectedHttpCode: 404 });
    });

    it('unhappy path - 400s when trying to delete more than 100 cases at a time', async () => {
      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: new Array(101).fill('id'),
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 400s when trying to delete 0 cases at a time', async () => {
      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [],
        expectedHttpCode: 400,
      });
    });

    describe('files', () => {
      afterEach(async () => {
        await deleteAllFiles({
          supertest,
        });
      });

      it('should delete all files associated with a case', async () => {
        const { caseInfo: postedCase } = await createCaseWithFiles({
          supertest: supertestWithoutAuth,
          fileKind: SECURITY_SOLUTION_FILE_KIND,
          owner: 'securitySolution',
        });

        await deleteCases({ supertest: supertestWithoutAuth, caseIDs: [postedCase.id] });

        const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
          listFiles({
            supertest: supertestWithoutAuth,
            params: {
              kind: SECURITY_SOLUTION_FILE_KIND,
            },
          }),
          findAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            query: {
              perPage: MAX_COMMENTS_PER_PAGE,
            },
          }),
        ]);

        expect(filesAfterDelete.total).to.be(0);
        expect(attachmentsAfterDelete.comments.length).to.be(0);
      });

      it('should delete all files associated with multiple cases', async () => {
        const [{ caseInfo: postedCase1 }, { caseInfo: postedCase2 }] = await Promise.all([
          createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
          }),
          createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
          }),
        ]);

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase1.id, postedCase2.id],
        });

        const [filesAfterDelete, attachmentsAfterDelete, attachmentsAfterDelete2] =
          await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: SECURITY_SOLUTION_FILE_KIND,
              },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase1.id,
              query: {
                perPage: MAX_COMMENTS_PER_PAGE,
              },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase2.id,
              query: {
                perPage: MAX_COMMENTS_PER_PAGE,
              },
            }),
          ]);

        expect(filesAfterDelete.total).to.be(0);
        expect(attachmentsAfterDelete.comments.length).to.be(0);
        expect(attachmentsAfterDelete2.comments.length).to.be(0);
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
          await createAlertsIndex(supertest, log);
          const signals = await createSecuritySolutionAlerts(supertest, log, 2);
          alerts = [signals.hits.hits[0] as Alerts[number], signals.hits.hits[1] as Alerts[number]];
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        it('removes a case from the alert schema when deleting a case', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('removes multiple cases from the alert schema when deleting all cases', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 2,
            indicesOfCaseToDelete: [0, 1],
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('removes multiple cases from the alert schema when deleting multiple cases', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 4,
            indicesOfCaseToDelete: [0, 2],
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has read access only', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            expectedHttpCode: 204,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            deleteCaseAuth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            expectedHttpCode: 204,
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            deleteCaseAuth: { user: obsSec, space: 'space1' },
          });
        });

        it('should delete the case ID from the alert schema when the user has read access to the kibana feature but no read access to the ES index', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            owner: 'securitySolutionFixture',
            alerts,
            getAlerts,
            expectedHttpCode: 204,
            deleteCaseAuth: { user: secSolutionOnlyReadNoIndexAlerts, space: 'space1' },
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

        it('removes a case from the alert schema when deleting a case', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('removes multiple cases from the alert schema when deleting all cases', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 2,
            indicesOfCaseToDelete: [0, 1],
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('removes multiple cases from the alert schema when deleting multiple cases', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 4,
            indicesOfCaseToDelete: [0, 2],
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
          });
        });

        it('should delete case ID from the alert schema when the user has read access only', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            expectedHttpCode: 204,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
            deleteCaseAuth: { user: obsOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should delete case ID from the alert schema when the user does NOT have access to the alert', async () => {
          await createCaseAttachAlertAndDeleteCase({
            supertest: supertestWithoutAuth,
            totalCases: 1,
            indicesOfCaseToDelete: [0],
            expectedHttpCode: 204,
            owner: 'observabilityFixture',
            alerts,
            getAlerts,
            deleteCaseAuth: { user: obsSec, space: 'space1' },
          });
        });
      });
    });

    describe('rbac', () => {
      describe('files', () => {
        // we need api_int_users and roles because they have authorization for the actual plugins (not the fixtures). This
        // is needed because the fixture plugins are not registered as file kinds
        before(async () => {
          await createUsersAndRoles(getService, api_int_users, api_int_roles);
        });

        after(async () => {
          await deleteUsersAndRoles(getService, api_int_users, api_int_roles);
        });

        it('should delete a case when the user has access to delete the case and files', async () => {
          const { caseInfo: postedCase } = await createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
            auth: { user: secAllUser, space: 'space1' },
          });

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            auth: { user: secAllUser, space: 'space1' },
          });

          const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: SECURITY_SOLUTION_FILE_KIND,
              },
              auth: { user: secAllUser, space: 'space1' },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase.id,
              query: {
                perPage: MAX_COMMENTS_PER_PAGE,
              },
              auth: { user: secAllUser, space: 'space1' },
            }),
          ]);

          expect(filesAfterDelete.total).to.be(0);
          expect(attachmentsAfterDelete.comments.length).to.be(0);
        });

        it('should not delete a case when the user does not have access to the file kind of the files', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolution' }),
            200,
            { user: secAllUser, space: 'space1' }
          );
          const { create: createdFile } = await createAndUploadFile({
            supertest: supertestWithoutAuth,
            createFileParams: {
              name: 'testfile',
              // use observability for the file kind which the security user should not have access to
              kind: OBSERVABILITY_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
            auth: { user: superUser, space: 'space1' },
          });

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [
              getFilesAttachmentReq({
                externalReferenceId: createdFile.file.id,
                owner: 'securitySolution',
              }),
            ],
            auth: { user: secAllUser, space: 'space1' },
          });

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            auth: { user: secAllUser, space: 'space1' },
            expectedHttpCode: 403,
          });

          const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: OBSERVABILITY_FILE_KIND,
              },
              auth: { user: superUser, space: 'space1' },
            }),
            getAllComments({
              supertest: supertestWithoutAuth,
              caseId: postedCase.id,
              auth: { user: secAllUser, space: 'space1' },
            }),
          ]);

          expect(filesAfterDelete.total).to.be(1);
          expect(attachmentsAfterDelete.length).to.be(1);
        });
      });

      it('User: security solution only - should delete a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 204,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('User: security solution only - should NOT delete a case of different owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 403,
          auth: { user: obsOnly, space: 'space1' },
        });
      });

      it('should get an error if the user has not permissions to all requested cases', async () => {
        const caseSec = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        const caseObs = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [caseSec.id, caseObs.id],
          expectedHttpCode: 403,
          auth: { user: obsOnly, space: 'space1' },
        });

        // Cases should have not been deleted.
        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseSec.id,
          expectedHttpCode: 200,
          auth: superUserSpace1Auth,
        });

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseObs.id,
          expectedHttpCode: 200,
          auth: superUserSpace1Auth,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT delete a case`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        });
      }

      it('should NOT delete a case in a space with no permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        /**
         * secOnly does not have access to space2 so it should 403
         */
        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });

      it('should NOT delete a case created in space2 by making a request to space1', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 404,
          auth: { user: secOnly, space: 'space1' },
        });
      });
    });
  });
};

const createCaseWithFiles = async ({
  supertest,
  fileKind,
  owner,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  fileKind: string;
  owner: string;
  auth?: { user: User; space: string | null };
}) => {
  const postedCase = await createCase(supertest, getPostCaseRequest({ owner }), 200, auth);

  const files = await Promise.all([
    createAndUploadFile({
      supertest,
      createFileParams: {
        name: 'testfile',
        kind: fileKind,
        mimeType: 'text/plain',
        meta: {
          caseIds: [postedCase.id],
          owner: [postedCase.owner],
        },
      },
      data: 'abc',
      auth,
    }),
    createAndUploadFile({
      supertest,
      createFileParams: {
        name: 'testfile',
        kind: fileKind,
        mimeType: 'text/plain',
        meta: {
          caseIds: [postedCase.id],
          owner: [postedCase.owner],
        },
      },
      data: 'abc',
      auth,
    }),
  ]);

  const caseWithAttachments = await bulkCreateAttachments({
    supertest,
    caseId: postedCase.id,
    params: [
      getFilesAttachmentReq({
        externalReferenceId: files[0].create.file.id,
        owner,
      }),
      getFilesAttachmentReq({
        externalReferenceId: files[1].create.file.id,
        owner,
      }),
    ],
    auth,
  });

  return {
    caseInfo: caseWithAttachments,
    attachments: files,
  };
};
