/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseResponse } from '@kbn/cases-plugin/common';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  createCase,
  deleteAllCaseItems,
  getAttachmentStats,
} from '../../../../common/lib/api';
import {
  getFilesAttachmentReq,
  postCaseReq,
  postExternalReferenceSOReq,
} from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_attachment_stats', () => {
    describe('delete all cases entities after each', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      describe('response structure', () => {
        it('should return the correctly formatted response', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const stats = await getAttachmentStats({ supertest, caseId: postedCase.id });

          expect(stats).to.eql({
            files: {
              total: 0,
            },
          });
        });
      });

      describe('files', () => {
        it('should return 0 for files when there are none', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          const stats = await getAttachmentStats({ supertest, caseId: postedCase.id });

          expect(stats.files).to.eql({ total: 0 });
        });

        it('should return 2 for files total when there are two files', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [getFilesAttachmentReq(), getFilesAttachmentReq()],
          });

          const stats = await getAttachmentStats({ supertest, caseId: postedCase.id });

          expect(stats.files).to.eql({ total: 2 });
        });

        it('should only count the 2 files for the total when there is also a test attachment', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [getFilesAttachmentReq(), getFilesAttachmentReq(), postExternalReferenceSOReq],
          });

          const stats = await getAttachmentStats({ supertest, caseId: postedCase.id });

          expect(stats.files).to.eql({ total: 2 });
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let theCase: CaseResponse;

      before(async () => {
        theCase = await createCase(supertestWithoutAuth, postCaseReq, 200, {
          user: superUser,
          space: 'space1',
        });

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: theCase.id,
          params: [getFilesAttachmentReq(), getFilesAttachmentReq()],
          auth: {
            user: superUser,
            space: 'space1',
          },
        });
      });

      after(async () => {
        await deleteAllCaseItems(es);
      });

      for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
        it(`should retrieve the stats when requesting the stats as the user: ${user.username}`, async () => {
          const stats = await getAttachmentStats({
            supertest: supertestWithoutAuth,
            caseId: theCase.id,
            auth: { user, space: 'space1' },
          });

          expect(stats.files).to.eql({ total: 2 });
        });
      }

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
        { user: obsOnly, space: 'space1' },
        { user: obsOnlyRead, space: 'space1' },
      ]) {
        it(`should return a 403 when requesting the stats as the user: ${scenario.user.username}`, async () => {
          await getAttachmentStats({
            supertest: supertestWithoutAuth,
            caseId: theCase.id,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }
    });
  });
};
