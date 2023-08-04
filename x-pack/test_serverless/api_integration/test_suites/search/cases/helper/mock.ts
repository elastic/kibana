/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Case,
  CaseSeverity,
  CaseStatuses,
} from '@kbn/cases-plugin/common/types/domain';
import type { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';

export const defaultUser = { email: null, full_name: null, username: 'elastic' };
/**
 * A null filled user will occur when the security plugin is disabled
 */
export const nullUser = { email: null, full_name: null, username: null };

export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Observability Issue',
  tags: ['defacement'],
  severity: CaseSeverity.LOW,
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  settings: {
    syncAlerts: true,
  },
  owner: 'cases',
  assignees: [],
};

/**
 * Return a request for creating a case.
 */
export const getPostCaseRequest = (req?: Partial<CasePostRequest>): CasePostRequest => ({
  ...postCaseReq,
  ...req,
});

export const postCaseResp = (
  id?: string | null,
  req: CasePostRequest = postCaseReq
): Partial<Case> => ({
  ...req,
  ...(id != null ? { id } : {}),
  comments: [],
  duration: null,
  severity: req.severity ?? CaseSeverity.LOW,
  totalAlerts: 0,
  totalComment: 0,
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: CaseStatuses.open,
  updated_by: null,
  category: null,
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
