/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CommentSchemaType,
  ContextTypeGeneratedAlertType,
  createAlertsString,
  isCommentGeneratedAlert,
  transformConnectorComment,
} from '../../../../plugins/cases/server/connectors';
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
  CaseType,
  CasesClientPostRequest,
  SubCaseResponse,
  AssociationType,
  SubCasesFindResponse,
  CommentRequest,
} from '../../../../plugins/cases/common/api';

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

/**
 * The fields for creating a collection style case.
 */
export const postCollectionReq: CasePostRequest = {
  ...postCaseReq,
  type: CaseType.collection,
};

/**
 * This is needed because the post api does not allow specifying the case type. But the response will include the type.
 */
export const userActionPostResp: CasesClientPostRequest = {
  ...postCaseReq,
  type: CaseType.individual,
};

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

export const postCommentGenAlertReq: ContextTypeGeneratedAlertType = {
  alerts: createAlertsString([
    { _id: 'test-id', _index: 'test-index', ruleId: 'rule-id', ruleName: 'rule name' },
    { _id: 'test-id2', _index: 'test-index', ruleId: 'rule-id', ruleName: 'rule name' },
  ]),
  type: CommentType.generatedAlert,
  owner: 'securitySolutionFixture',
};

export const postCaseResp = (
  id?: string | null,
  req: CasePostRequest = postCaseReq
): Partial<CaseResponse> => ({
  ...req,
  ...(id != null ? { id } : {}),
  comments: [],
  totalAlerts: 0,
  totalComment: 0,
  type: req.type ?? CaseType.individual,
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: CaseStatuses.open,
  updated_by: null,
});

interface CommentRequestWithID {
  id: string;
  comment: CommentSchemaType | CommentRequest;
}

export const commentsResp = ({
  comments,
  associationType,
}: {
  comments: CommentRequestWithID[];
  associationType: AssociationType;
}): Array<Partial<CommentResponse>> => {
  return comments.map(({ comment, id }) => {
    const baseFields = {
      id,
      created_by: defaultUser,
      pushed_at: null,
      pushed_by: null,
      updated_by: null,
    };

    if (isCommentGeneratedAlert(comment)) {
      return {
        associationType,
        ...transformConnectorComment(comment),
        ...baseFields,
      };
    } else {
      return {
        associationType,
        ...comment,
        ...baseFields,
      };
    }
  });
};

export const subCaseResp = ({
  id,
  totalAlerts,
  totalComment,
  status = CaseStatuses.open,
}: {
  id: string;
  status?: CaseStatuses;
  totalAlerts: number;
  totalComment: number;
}): Partial<SubCaseResponse> => ({
  status,
  id,
  totalAlerts,
  totalComment,
  closed_by: null,
  created_by: defaultUser,
  updated_by: defaultUser,
});

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

export const findSubCasesResp: SubCasesFindResponse = {
  ...findCommon,
  subCases: [],
};
