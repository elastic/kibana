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
  CaseStatuses,
  CaseType,
  CaseClientPostRequest,
  CommentRequestGeneratedAlertType,
  SubCaseResponse,
  CommentRequest,
  AssociationType,
  CollectionWithSubCaseResponse,
} from '../../../../plugins/case/common/api';
import {
  getAlertIds,
  isGeneratedAlertContext,
  isAlertContext,
} from '../../../../plugins/case/server/routes/api/utils';
export const defaultUser = { email: null, full_name: null, username: 'elastic' };
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
};

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
export const userActionPostResp: CaseClientPostRequest = {
  ...postCaseReq,
  type: CaseType.individual,
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

export const postCommentGenAlertReq: CommentRequestGeneratedAlertType = {
  alerts: [{ _id: 'test-id' }, { _id: 'test-id2' }],
  index: 'test-index',
  type: CommentType.generatedAlert,
};

export const postCaseResp = (
  id: string,
  req: CasePostRequest = postCaseReq
): Partial<CaseResponse> => ({
  ...req,
  id,
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
  comment: CommentRequest;
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
    if (isGeneratedAlertContext(comment)) {
      return {
        associationType,
        alertId: getAlertIds(comment),
        index: comment.index,
        type: comment.type,
        ...baseFields,
      };
    } else if (isAlertContext(comment)) {
      return {
        associationType,
        ...comment,
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
  // TODO: add this
  // created_by: defaultUser,
  updated_by: defaultUser,
});

interface FormattedCollectionResponse {
  caseInfo: Partial<CaseResponse>;
  subCase?: Partial<SubCaseResponse>;
  comments?: Array<Partial<CommentResponse>>;
}

export const formatCollectionResponse = (
  caseInfo: CollectionWithSubCaseResponse
): FormattedCollectionResponse => {
  return {
    caseInfo: removeServerGeneratedPropertiesFromCaseCollection(caseInfo),
    subCase: removeServerGeneratedPropertiesFromSubCase(caseInfo.subCase),
    comments: removeServerGeneratedPropertiesFromComments(
      caseInfo.subCase?.comments ?? caseInfo.comments
    ),
  };
};

export const removeServerGeneratedPropertiesFromSubCase = (
  subCase: Partial<SubCaseResponse> | undefined
): Partial<SubCaseResponse> | undefined => {
  if (!subCase) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { closed_at, created_at, updated_at, version, comments, ...rest } = subCase;
  return rest;
};

export const removeServerGeneratedPropertiesFromCaseCollection = (
  config: Partial<CollectionWithSubCaseResponse>
): Partial<CollectionWithSubCaseResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { closed_at, created_at, updated_at, version, subCase, ...rest } = config;
  return rest;
};

export const removeServerGeneratedPropertiesFromCase = (
  config: Partial<CaseResponse>
): Partial<CaseResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { closed_at, created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const removeServerGeneratedPropertiesFromComments = (
  comments: CommentResponse[] | undefined
): Array<Partial<CommentResponse>> | undefined => {
  return comments?.map((comment) => {
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
  count_in_progress_cases: 0,
};
