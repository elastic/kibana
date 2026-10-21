/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { COMMENT_ATTACHMENT_TYPE, LENS_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import type { RoleCredentials } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';

const OWNER = 'securitySolution';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');

  describe('attachments', () => {
    let adminAuthc: RoleCredentials;
    let viewerAuthc: RoleCredentials;

    before(async () => {
      adminAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      viewerAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(adminAuthc);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(viewerAuthc);
    });

    afterEach(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    const createCase = () =>
      svlCases.api.createCase(svlCases.api.getPostCaseRequest(OWNER), adminAuthc);

    describe('/attachments', () => {
      it('creates and gets a comment attachment', async () => {
        const theCase = await createCase();
        const params = svlCases.api.getPostUnifiedCommentReq(OWNER);

        const created = await svlCases.api.createAttachment(
          { caseId: theCase.id, params },
          adminAuthc
        );
        expect(created.type).to.be(COMMENT_ATTACHMENT_TYPE);
        expect(created.data).to.eql(params.data);
        expect(created.owner).to.be(OWNER);

        const fetched = await svlCases.api.getAttachment(
          { caseId: theCase.id, attachmentId: created.id },
          adminAuthc
        );
        expect(fetched).to.eql(created);
      });

      it('finds attachments filtered by type', async () => {
        const theCase = await createCase();
        const params = svlCases.api.getPostUnifiedCommentReq(OWNER);

        await svlCases.api.createAttachment({ caseId: theCase.id, params }, adminAuthc);
        await svlCases.api.createAttachment({ caseId: theCase.id, params }, adminAuthc);

        const comments = await svlCases.api.findAttachments(
          { caseId: theCase.id, query: { type: COMMENT_ATTACHMENT_TYPE } },
          adminAuthc
        );
        expect(comments.total).to.be(2);
        expect(comments.page).to.be(1);
        expect(comments.data.map(({ type }) => type)).to.eql([
          COMMENT_ATTACHMENT_TYPE,
          COMMENT_ATTACHMENT_TYPE,
        ]);

        const lens = await svlCases.api.findAttachments(
          { caseId: theCase.id, query: { type: LENS_ATTACHMENT_TYPE } },
          adminAuthc
        );
        expect(lens.total).to.be(0);
        expect(lens.data).to.eql([]);
      });

      it('replaces an attachment', async () => {
        const theCase = await createCase();
        const params = svlCases.api.getPostUnifiedCommentReq(OWNER);
        const created = await svlCases.api.createAttachment(
          { caseId: theCase.id, params },
          adminAuthc
        );

        const replaced = await svlCases.api.updateAttachment(
          {
            caseId: theCase.id,
            attachmentId: created.id,
            req: { ...params, data: { content: 'updated comment' }, version: created.version },
          },
          adminAuthc
        );
        expect(replaced.data?.content).to.be('updated comment');
        expect(replaced.version).not.to.be(created.version);
      });

      it('deletes an attachment', async () => {
        const theCase = await createCase();
        const created = await svlCases.api.createAttachment(
          { caseId: theCase.id, params: svlCases.api.getPostUnifiedCommentReq(OWNER) },
          adminAuthc
        );

        await svlCases.api.deleteAttachment(
          { caseId: theCase.id, attachmentId: created.id },
          adminAuthc
        );
        await svlCases.api.getAttachment(
          { caseId: theCase.id, attachmentId: created.id, expectedHttpCode: 404 },
          adminAuthc
        );
      });

      it('returns 403 when a viewer creates an attachment', async () => {
        const theCase = await createCase();

        await svlCases.api.createAttachment(
          {
            caseId: theCase.id,
            params: svlCases.api.getPostUnifiedCommentReq(OWNER),
            expectedHttpCode: 403,
          },
          viewerAuthc
        );
      });
    });

    describe('/comments', () => {
      it('creates a comment in the legacy shape and reads it through both routes', async () => {
        const theCase = await createCase();
        const params = svlCases.api.getPostCommentReq(OWNER);

        const caseWithComment = await svlCases.api.createComment(
          { caseId: theCase.id, params },
          adminAuthc
        );
        expect(caseWithComment.comments?.length).to.be(1);
        const [{ id: commentId }] = caseWithComment.comments ?? [];

        const legacy = await svlCases.api.getComment({ caseId: theCase.id, commentId }, adminAuthc);
        expect(legacy.type).to.be(AttachmentType.user);
        expect(legacy).to.have.property('comment', params.comment);

        const unified = await svlCases.api.getAttachment(
          { caseId: theCase.id, attachmentId: commentId },
          adminAuthc
        );
        expect(unified.type).to.be(COMMENT_ATTACHMENT_TYPE);
        expect(unified.data?.content).to.be(params.comment);
      });

      it('returns 403 when a viewer creates a comment', async () => {
        const theCase = await createCase();

        await svlCases.api.createComment(
          {
            caseId: theCase.id,
            params: svlCases.api.getPostCommentReq(OWNER),
            expectedHttpCode: 403,
          },
          viewerAuthc
        );
      });
    });
  });
};
