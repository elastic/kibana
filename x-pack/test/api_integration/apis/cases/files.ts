/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { APP_ID as CASES_APP_ID } from '@kbn/cases-plugin/common/constants';
import { APP_ID as SECURITY_SOLUTION_APP_ID } from '@kbn/security-solution-plugin/common/constants';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';
import { Owner } from '@kbn/cases-plugin/common/constants/types';
import { BaseFilesClient } from '@kbn/shared-ux-file-types';
import { User } from '../../../cases_api_integration/common/lib/authentication/types';
import {
  createFile,
  deleteFiles,
  uploadFile,
  downloadFile,
  createAndUploadFile,
  listFiles,
  getFileById,
  deleteAllFiles,
} from '../../../cases_api_integration/common/lib/api';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  casesAllUser,
  casesNoDeleteUser,
  casesReadUser,
  obsCasesAllUser,
  obsCasesNoDeleteUser,
  obsCasesReadUser,
  secAllCasesNoDeleteUser,
  secAllUser,
  secReadCasesReadUser,
} from './common/users';

interface TestScenario {
  user: User;
  owner: Owner;
}

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('files', () => {
    describe('failure requests', () => {
      const createFileFailure = async (scenario: TestScenario) => {
        await createFile({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          params: {
            kind: scenario.owner,
            name: 'testFile',
            mimeType: 'image/png',
          },
          expectedHttpCode: 403,
        });
      };

      const deleteFileFailure = async (scenario: TestScenario) => {
        await deleteFiles({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          files: [{ kind: scenario.owner, id: 'abc' }],
          expectedHttpCode: 403,
        });
      };

      const uploadFileFailure = async (scenario: TestScenario) => {
        await uploadFile({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          data: 'abc',
          kind: scenario.owner,
          mimeType: 'image/png',
          fileId: '123',
          expectedHttpCode: 403,
        });
      };

      const listFilesFailure = async (scenario: TestScenario) => {
        await listFiles({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          params: {
            kind: scenario.owner,
          },
          expectedHttpCode: 403,
        });
      };

      const downloadFileFailure = async (scenario: TestScenario) => {
        await downloadFile({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          fileId: 'abc',
          fileName: '123',
          mimeType: 'image/png',
          kind: scenario.owner,
          expectedHttpCode: 401,
        });
      };

      const getFileByIdFailure = async (scenario: TestScenario) => {
        await getFileById({
          supertest: supertestWithoutAuth,
          auth: { user: scenario.user, space: null },
          id: 'abc',
          kind: scenario.owner,
          expectedHttpCode: 403,
        });
      };

      describe('user not authorized for a delete operation', () => {
        const testScenarios: TestScenario[] = [
          { user: secAllCasesNoDeleteUser, owner: SECURITY_SOLUTION_APP_ID },
          { user: casesNoDeleteUser, owner: CASES_APP_ID },
          { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
        ];

        for (const scenario of testScenarios) {
          it('should fail to delete a file', async () => {
            await deleteFileFailure(scenario);
          });
        }
      });

      describe('user not authorized for write operations', () => {
        const testScenarios: TestScenario[] = [
          { user: secReadCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
          { user: casesReadUser, owner: CASES_APP_ID },
          { user: obsCasesReadUser, owner: OBSERVABILITY_APP_ID },
        ];

        for (const scenario of testScenarios) {
          it('should fail to create a file', async () => {
            await createFileFailure(scenario);
          });

          it('should fail to upload a file', async () => {
            await uploadFileFailure(scenario);
          });

          it('should fail to delete a file', async () => {
            await deleteFileFailure(scenario);
          });
        }
      });

      describe('user not authorized for file kind', () => {
        const testScenarios: TestScenario[] = [
          { user: secAllUser, owner: CASES_APP_ID },
          {
            user: casesAllUser,
            owner: SECURITY_SOLUTION_APP_ID,
          },
          {
            user: obsCasesAllUser,
            owner: CASES_APP_ID,
          },
        ];

        for (const scenario of testScenarios) {
          describe(`scenario user: ${scenario.user.username} owner: ${scenario.owner}`, () => {
            it('should fail to create a file', async () => {
              await createFileFailure(scenario);
            });

            it('should fail to upload a file', async () => {
              await uploadFileFailure(scenario);
            });

            it('should fail to delete a file', async () => {
              await deleteFileFailure(scenario);
            });

            it('should fail to list files', async () => {
              await listFilesFailure(scenario);
            });

            it('should fail to download a file', async () => {
              await downloadFileFailure(scenario);
            });

            it('should fail to get a file by its id', async () => {
              await getFileByIdFailure(scenario);
            });
          });
        }
      });
    });

    describe('successful requests', () => {
      describe('users with read privileges', () => {
        const testScenarios: TestScenario[] = [
          { user: secReadCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
          { user: casesReadUser, owner: CASES_APP_ID },
          { user: obsCasesReadUser, owner: OBSERVABILITY_APP_ID },
        ];

        for (const scenario of testScenarios) {
          describe(`scenario user: ${scenario.user.username} owner: ${scenario.owner}`, () => {
            let createdFile: Awaited<ReturnType<BaseFilesClient['create']>>;

            beforeEach(async () => {
              const { create } = await createAndUploadFile({
                supertest,
                data: 'abc',
                createFileParams: {
                  name: 'testFile',
                  mimeType: 'image/png',
                  kind: scenario.owner,
                },
              });
              createdFile = create;
            });

            afterEach(async () => {
              await deleteAllFiles({
                supertest,
                kind: scenario.owner,
              });
            });

            it('should list files', async () => {
              const files = await listFiles({
                supertest: supertestWithoutAuth,
                params: { kind: scenario.owner },
                auth: { user: scenario.user, space: null },
              });

              expect(files.total).to.be(1);
              expect(files.files[0].name).to.be(createdFile.file.name);
            });

            it('should get a file by its id', async () => {
              const file = await getFileById({
                supertest: supertestWithoutAuth,
                id: createdFile.file.id,
                kind: scenario.owner,
                auth: { user: scenario.user, space: null },
              });

              expect(file.file.name).to.be(createdFile.file.name);
            });
          });
        }
      });

      describe('users with all privileges', () => {
        const testScenarios: TestScenario[] = [
          { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
          { user: casesAllUser, owner: CASES_APP_ID },
          { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
        ];

        for (const scenario of testScenarios) {
          describe(`scenario user: ${scenario.user.username} owner: ${scenario.owner}`, () => {
            it('should create and delete a file', async () => {
              const createResult = await createFile({
                supertest: supertestWithoutAuth,
                auth: { user: scenario.user, space: null },
                params: {
                  kind: scenario.owner,
                  name: 'testFile',
                  mimeType: 'image/png',
                },
              });

              await deleteFiles({
                supertest: supertestWithoutAuth,
                auth: { user: scenario.user, space: null },
                files: [{ kind: scenario.owner, id: createResult.file.id }],
              });
            });

            describe('delete created file after test', () => {
              afterEach(async () => {
                await deleteAllFiles({
                  supertest,
                  kind: scenario.owner,
                });
              });

              it('should list files', async () => {
                const { create } = await createAndUploadFile({
                  supertest: supertestWithoutAuth,
                  data: 'abc',
                  createFileParams: {
                    name: 'testFile',
                    mimeType: 'image/png',
                    kind: scenario.owner,
                  },
                  auth: { user: scenario.user, space: null },
                });

                const files = await listFiles({
                  supertest: supertestWithoutAuth,
                  params: { kind: scenario.owner },
                  auth: { user: scenario.user, space: null },
                });

                expect(files.total).to.be(1);
                expect(files.files[0].name).to.be(create.file.name);
              });

              it('should download a file', async () => {
                const { create } = await createAndUploadFile({
                  supertest: supertestWithoutAuth,
                  data: 'abc',
                  createFileParams: {
                    name: 'testFile',
                    mimeType: 'image/png',
                    kind: scenario.owner,
                  },
                  auth: { user: scenario.user, space: null },
                });

                const { body: buffer, header } = await downloadFile({
                  supertest,
                  auth: { user: scenario.user, space: null },
                  fileId: create.file.id,
                  kind: scenario.owner,
                  mimeType: 'image/png',
                  fileName: 'test.png',
                });

                expect(header['content-type']).to.eql('image/png');
                expect(header['content-disposition']).to.eql('attachment; filename="test.png"');
                expect(buffer.toString('utf8')).to.eql('abc');
              });

              it('should upload a file', async () => {
                const createResult = await createFile({
                  supertest: supertestWithoutAuth,
                  auth: { user: scenario.user, space: null },
                  params: {
                    kind: scenario.owner,
                    name: 'testFile',
                    mimeType: 'image/png',
                  },
                });

                const uploadResult = await uploadFile({
                  supertest: supertestWithoutAuth,
                  auth: { user: scenario.user, space: null },
                  data: 'abc',
                  kind: scenario.owner,
                  mimeType: 'image/png',
                  fileId: createResult.file.id,
                });

                expect(uploadResult.ok).to.be(true);
                expect(uploadResult.size).to.be(3);
              });
            });
          });
        }
      });
    });
  });
};
