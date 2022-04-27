/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  CaseStatuses,
  CommentRequest,
  CommentRequestActionsType,
} from '@kbn/cases-plugin/common/api';

export const defaultUser = { email: null, full_name: null, username: 'elastic' };
/**
 * A null filled user will occur when the security plugin is disabled
 */
export const nullUser = { email: null, full_name: null, username: null };

export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  tags: ['defacement'],
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  settings: {
    syncAlerts: true,
  },
  owner: 'securitySolutionFixture',
};

/**
 * Return a request for creating a case.
 */
export const getPostCaseRequest = (req?: Partial<CasePostRequest>): CasePostRequest => ({
  ...postCaseReq,
  ...req,
});

export const postCommentUserReq: CommentRequestUserType = {
  comment: 'This is a cool comment',
  type: CommentType.user,
  owner: 'securitySolutionFixture',
};

export const postCommentAlertReq: CommentRequestAlertType = {
  alertId: 'test-id',
  index: 'test-index',
  rule: { id: 'test-rule-id', name: 'test-index-id' },
  type: CommentType.alert,
  owner: 'securitySolutionFixture',
};

export const postCommentActionsReq: CommentRequestActionsType = {
  comment: 'comment text',
  actions: {
    targets: [
      {
        hostname: 'host-name',
        endpointId: 'endpoint-id',
      },
    ],
    type: 'isolate',
  },
  type: CommentType.actions,
  owner: 'securitySolutionFixture',
};

export const postCaseResp = (
  id?: string | null,
  req: CasePostRequest = postCaseReq
): Partial<CaseResponse> => ({
  ...req,
  ...(id != null ? { id } : {}),
  comments: [],
  duration: null,
  totalAlerts: 0,
  totalComment: 0,
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: CaseStatuses.open,
  updated_by: null,
});

interface CommentRequestWithID {
  id: string;
  comment: CommentRequest;
}

export const commentsResp = ({
  comments,
}: {
  comments: CommentRequestWithID[];
}): Array<Partial<CommentResponse>> => {
  return comments.map(({ comment, id }) => {
    const baseFields = {
      id,
      created_by: defaultUser,
      pushed_at: null,
      pushed_by: null,
      updated_by: null,
    };

    return {
      ...comment,
      ...baseFields,
    };
  });
};

const findCommon = {
  page: 1,
  per_page: 20,
  total: 0,
  count_open_cases: 0,
  count_closed_cases: 0,
  count_in_progress_cases: 0,
};

export const findCasesResp: CasesFindResponse = {
  ...findCommon,
  cases: [],
};
