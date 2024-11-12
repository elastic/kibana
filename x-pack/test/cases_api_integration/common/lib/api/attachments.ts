/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { CASES_INTERNAL_URL, CASES_URL } from '@kbn/cases-plugin/common/constants';
import {
  getCaseFindAttachmentsUrl,
  getCasesDeleteFileAttachmentsUrl,
} from '@kbn/cases-plugin/common/api';
import { Case, AttachmentType } from '@kbn/cases-plugin/common';
import {
  BulkGetAttachmentsResponse,
  AttachmentRequest,
  BulkCreateAttachmentsRequest,
  AttachmentPatchRequest,
  AttachmentsFindResponse,
  PostFileAttachmentRequest,
} from '@kbn/cases-plugin/common/types/api';
import { Attachments, Attachment } from '@kbn/cases-plugin/common/types/domain';
import { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';
import { createCase } from './case';
import { postCaseReq } from '../mock';

export const bulkGetAttachments = async ({
  supertest,
  attachmentIds,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  attachmentIds: string[];
  caseId: string;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<BulkGetAttachmentsResponse> => {
  const { body: comments } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_INTERNAL_URL}/${caseId}/attachments/_bulk_get`)
    .send({ ids: attachmentIds })
    .set('kbn-xsrf', 'abc')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comments;
};

export const createComment = async ({
  supertest,
  caseId,
  params,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
  headers = {},
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  params: AttachmentRequest;
  auth?: { user: User; space: string | null } | null;
  expectedHttpCode?: number;
  headers?: Record<string, string | string[]>;
}): Promise<Case> => {
  const apiCall = supertest.post(
    `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/comments`
  );

  void setupAuth({ apiCall, headers, auth });

  const { body: theCase } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const createFileAttachment = async ({
  supertest,
  caseId,
  params,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
  headers = {},
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  params: PostFileAttachmentRequest;
  auth?: { user: User; space: string | null } | null;
  expectedHttpCode?: number;
  headers?: Record<string, string | string[]>;
}): Promise<Case> => {
  const apiCall = supertest.post(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/files`);
  void setupAuth({ apiCall, headers, auth });

  const { body: theCase } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .attach('file', Buffer.from(params.file as unknown as string), params.filename)
    .expect(expectedHttpCode);

  return theCase;
};

export const bulkCreateAttachments = async ({
  supertest,
  caseId,
  params,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  params: BulkCreateAttachmentsRequest;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<Case> => {
  const { body: theCase } = await supertest
    .post(
      `${getSpaceUrlPrefix(auth.space)}${CASES_INTERNAL_URL}/${caseId}/attachments/_bulk_create`
    )
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const createCaseAndBulkCreateAttachments = async ({
  supertest,
  numberOfAttachments = 3,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  numberOfAttachments?: number;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<{ theCase: Case; attachments: BulkCreateAttachmentsRequest }> => {
  const postedCase = await createCase(supertest, postCaseReq);
  const attachments = getAttachments(numberOfAttachments);
  const patchedCase = await bulkCreateAttachments({
    supertest,
    caseId: postedCase.id,
    params: attachments,
  });

  return { theCase: patchedCase, attachments };
};

export const getAttachments = (numberOfAttachments: number): BulkCreateAttachmentsRequest => {
  return [...Array(numberOfAttachments)].map((_, index) => {
    if (index % 10 === 0) {
      return {
        type: AttachmentType.user,
        comment: `Test ${index + 1}`,
        owner: 'securitySolutionFixture',
      };
    }

    return {
      type: AttachmentType.alert,
      alertId: [`test-id-${index + 1}`],
      index: [`test-index-${index + 1}`],
      rule: {
        id: `rule-test-id-${index + 1}`,
        name: `Test ${index + 1}`,
      },
      owner: 'securitySolutionFixture',
    };
  });
};

export const deleteComment = async ({
  supertest,
  caseId,
  commentId,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  commentId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<{} | Error> => {
  const { body: comment } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments/${commentId}`)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode)
    .send();

  return comment;
};

export const deleteAllComments = async ({
  supertest,
  caseId,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<{} | Error> => {
  const { body: comment } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode)
    .send();

  return comment;
};

export const getAllComments = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<Attachments> => {
  const { body: comments } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comments;
};

export const getComment = async ({
  supertest,
  caseId,
  commentId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  commentId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<Attachment> => {
  const { body: comment } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments/${commentId}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comment;
};

export const updateComment = async ({
  supertest,
  caseId,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
  headers = {},
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  req: AttachmentPatchRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null } | null;
  headers?: Record<string, string | string[]>;
}): Promise<Case> => {
  const apiCall = supertest.patch(
    `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/comments`
  );

  void setupAuth({ apiCall, headers, auth });
  const { body: res } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send(req)
    .expect(expectedHttpCode);

  return res;
};

export const bulkDeleteFileAttachments = async ({
  supertest,
  caseId,
  fileIds,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  fileIds: string[];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<void> => {
  await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${getCasesDeleteFileAttachmentsUrl(caseId)}`)
    .set('kbn-xsrf', 'true')
    .send({ ids: fileIds })
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);
};

export const findAttachments = async ({
  supertest,
  caseId,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<AttachmentsFindResponse> => {
  const { body } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseFindAttachmentsUrl(caseId)}`)
    .set('kbn-xsrf', 'true')
    .query(query)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return body;
};
