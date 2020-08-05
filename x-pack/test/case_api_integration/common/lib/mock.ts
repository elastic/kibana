/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CasePostRequest,
  CaseResponse,
  CasesFindResponse,
} from '../../../../plugins/case/common/api';
export const defaultUser = { email: null, full_name: null, username: 'elastic' };
export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  tags: ['defacement'],
};

export const postCommentReq: { comment: string } = {
  comment: 'This is a cool comment',
};

export const postCaseResp = (id: string): Partial<CaseResponse> => ({
  ...postCaseReq,
  id,
  comments: [],
  totalComment: 0,
  connector_id: 'none',
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: 'open',
  updated_by: null,
});

export const removeServerGeneratedPropertiesFromCase = (
  config: Partial<CaseResponse>
): Partial<CaseResponse> => {
  const { closed_at, created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const findCasesResp: CasesFindResponse = {
  page: 1,
  per_page: 20,
  total: 0,
  cases: [],
  count_open_cases: 0,
  count_closed_cases: 0,
};
