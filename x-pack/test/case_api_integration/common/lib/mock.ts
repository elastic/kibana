/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CasePostRequest,
  CaseResponse,
  CasesFindResponse,
  CommentResponse,
  ConnectorTypes,
  CommentRequestUserType,
  CommentRequestAlertType,
  CommentType,
} from '../../../../plugins/case/common/api';
export const defaultUser = { email: null, full_name: null, username: 'elastic' };
export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  tags: ['defacement'],
  connector: {
    id: 'none',
    name: 'none',
    type: '.none' as ConnectorTypes,
    fields: null,
  },
};

export const postCommentUserReq: CommentRequestUserType = {
  comment: 'This is a cool comment',
  type: CommentType.user,
};

export const postCommentAlertReq: CommentRequestAlertType = {
  alertId: 'test-id',
  index: 'test-index',
  type: CommentType.alert,
};

export const postCaseResp = (
  id: string,
  req: CasePostRequest = postCaseReq
): Partial<CaseResponse> => ({
  ...req,
  id,
  comments: [],
  totalComment: 0,
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: 'open',
  updated_by: null,
});

export const removeServerGeneratedPropertiesFromCase = (
  config: Partial<CaseResponse>
): Partial<CaseResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { closed_at, created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const removeServerGeneratedPropertiesFromComments = (
  comments: CommentResponse[]
): Array<Partial<CommentResponse>> => {
  return comments.map((comment) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { created_at, updated_at, version, ...rest } = comment;
    return rest;
  });
};

export const findCasesResp: CasesFindResponse = {
  page: 1,
  per_page: 20,
  total: 0,
  cases: [],
  count_open_cases: 0,
  count_closed_cases: 0,
};
