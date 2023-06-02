/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  deleteCases,
  createComment,
  getCase,
  superUserSpace1Auth,
  findCases,
  deleteComment,
  getSpaceUrlPrefix,
  updateComment,
  deleteAllComments,
} from '../../../common/lib/api';
import {
  superUser,
  secOnlyDelete,
  secOnlyNoDelete,
} from '../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('user with deletion sub privilege', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('successful operations', () => {
      it(`should delete a case`, async () => {
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
          expectedHttpCode: 204,
          auth: { user: secOnlyDelete, space: 'space1' },
        });
      });

      it(`should delete a case with a comment`, async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space1' },
        });

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [secCase.id],
          expectedHttpCode: 204,
          auth: { user: secOnlyDelete, space: 'space1' },
        });
      });

      it(`should delete a comment from the appropriate owner`, async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space1' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space1' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnlyDelete, space: 'space1' },
        });
      });

      it(`should delete all comments from a case`, async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space1' },
        });

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space1' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          auth: { user: secOnlyDelete, space: 'space1' },
        });
      });
    });

    describe('failed operations', () => {
      describe('cases', () => {
        for (const scenario of [{ user: secOnlyDelete, space: 'space1' }]) {
          it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
            scenario.space
          } - should NOT read a case`, async () => {
            // super user creates a case at the appropriate space
            await createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture' }),
              200,
              {
                user: superUser,
                space: scenario.space,
              }
            );

            // user should not be able to read cases at the appropriate space
            await findCases({
              supertest: supertestWithoutAuth,
              auth: {
                user: scenario.user,
                space: scenario.space,
              },
              expectedHttpCode: 403,
            });
          });
        }

        it('should not get a case when the user does not have read permissions', async () => {
          const newCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          for (const user of [secOnlyDelete]) {
            await getCase({
              supertest: supertestWithoutAuth,
              caseId: newCase.id,
              expectedHttpCode: 403,
              auth: { user, space: 'space1' },
            });
          }
        });

        it(`should not create a case`, async () => {
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            403,
            {
              user: secOnlyDelete,
              space: 'space1',
            }
          );
        });

        it(`should create a case but not delete a case`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnlyNoDelete,
              space: 'space1',
            }
          );

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [caseInfo.id],
            expectedHttpCode: 403,
            auth: { user: secOnlyNoDelete, space: 'space1' },
          });
        });
      });

      describe('comments', () => {
        for (const scenario of [{ user: secOnlyDelete, space: 'space1' }]) {
          it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
            scenario.space
          } - should NOT read a comment`, async () => {
            // super user creates a case and comment in the appropriate space
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture' }),
              200,
              { user: superUser, space: scenario.space }
            );

            await createComment({
              supertest: supertestWithoutAuth,
              auth: { user: superUser, space: scenario.space },
              params: { ...postCommentUserReq, owner: 'securitySolutionFixture' },
              caseId: caseInfo.id,
            });

            // user should not be able to read comments
            await supertestWithoutAuth
              .get(`${getSpaceUrlPrefix(scenario.space)}${CASES_URL}/${caseInfo.id}/comments/_find`)
              .auth(scenario.user.username, scenario.user.password)
              .expect(403);
          });
        }

        it('should NOT update a comment', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          const newComment = 'Well I decided to update my comment. So what? Deal with it.';
          await updateComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            req: {
              ...postCommentUserReq,
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              comment: newComment,
            },
            auth: { user: secOnlyDelete, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        it('should not create a comment', async () => {
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
            auth: { user: secOnlyDelete, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        it(`should create a comment but not delete a comment`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: secOnlyNoDelete,
              space: 'space1',
            }
          );

          const commentResp = await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: { user: secOnlyNoDelete, space: 'space1' },
          });

          await deleteComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            commentId: commentResp.comments![0].id,
            auth: { user: secOnlyNoDelete, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      });
    });
  });
};
