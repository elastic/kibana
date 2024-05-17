/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Owner } from '@kbn/cases-plugin/common/constants/types';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';
import { roles as api_int_roles } from '../../../../../api_integration/apis/cases/common/roles';
import {
  users as api_int_users,
  casesOnlyReadDeleteUser,
  obsCasesOnlyReadDeleteUser,
  secAllCasesOnlyReadDeleteUser,
} from '../../../../../api_integration/apis/cases/common/users';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  bulkDeleteFileAttachments,
  createCase,
  createFile,
  deleteAllCaseItems,
  deleteAllFiles,
} from '../../../../common/lib/api';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import { superUser } from '../../../../common/lib/authentication/users';
import { getFilesAttachmentReq, getPostCaseRequest } from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_file_attachments deletion sub privilege', () => {
    // we need api_int_users and roles because they have authorization for the actual plugins (not the fixtures). This
    // is needed because the fixture plugins are not registered as file kinds
    before(async () => {
      await createUsersAndRoles(getService, api_int_users, api_int_roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, api_int_users, api_int_roles);
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      after(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      for (const scenario of [
        {
          user: secAllCasesOnlyReadDeleteUser,
          owner: 'securitySolution',
        },
        { user: obsCasesOnlyReadDeleteUser, owner: 'observability' },
        { user: casesOnlyReadDeleteUser, owner: 'cases' },
      ]) {
        it(`successfully deletes a file for user ${scenario.user.username} with owner ${scenario.owner} when an attachment does not exist`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.owner }),
            200,
            { user: superUser, space: 'space1' }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.owner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [caseInfo.id],
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
          });
        });

        it(`successfully deletes a file for user ${scenario.user.username} with owner ${scenario.owner} when an attachment exists`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.owner }),
            200,
            { user: superUser, space: 'space1' }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.owner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [caseInfo.id],
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: [
              getFilesAttachmentReq({
                externalReferenceId: create.file.id,
                owner: scenario.owner,
              }),
            ],
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
          });
        });
      }
    });
  });
};
