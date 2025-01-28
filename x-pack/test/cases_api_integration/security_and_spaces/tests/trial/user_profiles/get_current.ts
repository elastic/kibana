/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { CreateCaseUserAction, User, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import { setupSuperUserProfile } from '../../../../common/lib/api/user_profiles';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../../common/lib/authentication/users';
import {
  createCase,
  createComment,
  createConfiguration,
  deleteAllCaseItems,
  getComment,
  updateCase,
  updateComment,
  getConfigurationRequest,
  updateConfiguration,
} from '../../../../common/lib/api';
import { findCaseUserActions } from '../../../../common/lib/api/user_actions';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('user_profiles', () => {
    describe('get_current', () => {
      let headers: Record<string, string>;
      let superUserWithProfile: User;
      let superUserInfo: User;

      before(async () => {
        ({ headers, superUserInfo, superUserWithProfile } = await setupSuperUserProfile(
          getService
        ));
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      describe('user actions', () => {
        describe('createdBy', () => {
          it('sets the profile uid for a case', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const { userActions } = await findCaseUserActions({
              supertest: supertestWithoutAuth,
              caseID: caseInfo.id,
            });

            const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;
            expect(createCaseUserAction.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            const { userActions } = await findCaseUserActions({
              supertest: supertestWithoutAuth,
              caseID: caseInfo.id,
            });

            const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;
            expect(createCaseUserAction.created_by).to.eql(superUserInfo);
          });
        });
      });

      describe('configure', () => {
        describe('createdBy', () => {
          it('sets the profile uid', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              headers
            );

            expect(configuration.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' })
            );

            expect(configuration.created_by).to.eql(superUserInfo);
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              headers
            );

            const newConfiguration = await updateConfiguration(
              supertestWithoutAuth,
              configuration.id,
              {
                closure_type: 'close-by-pushing',
                version: configuration.version,
              },
              200,
              null,
              headers
            );

            expect(newConfiguration.updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' })
            );

            const newConfiguration = await updateConfiguration(
              supertestWithoutAuth,
              configuration.id,
              {
                closure_type: 'close-by-pushing',
                version: configuration.version,
              }
            );

            expect(newConfiguration.updated_by).to.eql(superUserInfo);
          });
        });
      });

      describe('comment', () => {
        describe('createdBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers,
            });

            expect(patchedCase.comments![0].created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
            });

            expect(patchedCase.comments![0].created_by).to.eql(superUserInfo);
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers,
            });

            const updatedCase = await updateComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              req: {
                id: patchedCase.comments![0].id,
                version: patchedCase.comments![0].version,
                comment: 'a new comment',
                type: AttachmentType.user,
                owner: 'securitySolutionFixture',
              },
              auth: null,
              headers,
            });

            const patchedComment = await getComment({
              supertest: supertestWithoutAuth,
              caseId: updatedCase.id,
              commentId: patchedCase.comments![0].id,
            });

            expect(patchedComment.updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
            });

            const updatedCase = await updateComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              req: {
                id: patchedCase.comments![0].id,
                version: patchedCase.comments![0].version,
                comment: 'a new comment',
                type: AttachmentType.user,
                owner: 'securitySolutionFixture',
              },
            });

            const patchedComment = await getComment({
              supertest: supertestWithoutAuth,
              caseId: updatedCase.id,
              commentId: patchedCase.comments![0].id,
            });

            expect(patchedComment.updated_by).to.eql(superUserInfo);
          });
        });
      });

      describe('case', () => {
        describe('closedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    status: CaseStatuses.closed,
                  },
                ],
              },
              headers,
              auth: null,
            });

            expect(patchedCases[0].closed_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    status: CaseStatuses.closed,
                  },
                ],
              },
            });

            expect(patchedCases[0].closed_by).to.eql(superUserInfo);
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    title: 'hello',
                  },
                ],
              },
              headers,
              auth: null,
            });

            expect(patchedCases[0].updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    title: 'hello',
                  },
                ],
              },
            });

            expect(patchedCases[0].updated_by).to.eql(superUserInfo);
          });
        });

        describe('createdBy', () => {
          it('sets the profile uid for a case', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            expect(caseInfo.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
              user: superUser,
              space: null,
            });

            expect(caseInfo.created_by).to.eql(superUserInfo);
          });
        });
      });
    });
  });
}
