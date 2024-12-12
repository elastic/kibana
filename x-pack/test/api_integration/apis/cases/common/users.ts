/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { User } from '../../../../cases_api_integration/common/lib/authentication/types';
import {
  casesAll,
  casesV2All,
  casesV3All,
  casesV3NoAssignee,
  casesV3ReadAndAssignee,
  casesNoDelete,
  casesOnlyDelete,
  casesOnlyReadDelete,
  casesRead,
  obsCasesAll,
  obsCasesV2All,
  obsCasesV3All,
  obsCasesNoDelete,
  obsCasesOnlyDelete,
  obsCasesOnlyReadDelete,
  obsCasesRead,
  secAll,
  secCasesV2All,
  secCasesV3All,
  secAllCasesNoDelete,
  secAllCasesNone,
  secAllCasesOnlyDelete,
  secAllCasesOnlyReadDelete,
  secAllCasesRead,
  secAllSpace1,
  secRead,
  secReadCasesAll,
  secReadCasesNone,
  secReadCasesRead,
  casesV2NoReopenWithCreateComment,
  obsCasesV2NoReopenWithCreateComment,
  secCasesV2NoReopenWithCreateComment,
  secCasesV2NoCreateCommentWithReopen,
  casesV2NoCreateCommentWithReopen,
  obsCasesV2NoCreateCommentWithReopen,
} from './roles';

/**
 * Users for Cases in Security Solution
 */

export const secAllCasesOnlyDeleteUser: User = {
  username: 'sec_all_cases_only_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesOnlyDelete.name],
};

export const secAllCasesOnlyReadDeleteUser: User = {
  username: 'sec_all_cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesOnlyReadDelete.name],
};

export const secAllCasesNoDeleteUser: User = {
  username: 'sec_all_cases_no_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesNoDelete.name],
};

export const secAllUser: User = {
  username: 'sec_all_user_api_int',
  password: 'password',
  roles: [secAll.name],
};

export const secCasesV2AllUser: User = {
  username: 'sec_cases_v2_all_user_api_int',
  password: 'password',
  roles: [secCasesV2All.name],
};

export const secCasesV3AllUser: User = {
  username: 'sec_cases_v3_all_user_api_int',
  password: 'password',
  roles: [secCasesV3All.name],
};

export const secCasesV2NoReopenWithCreateCommentUser: User = {
  username: 'sec_cases_v2_no_reopen_with_create_comment_user_api_int',
  password: 'password',
  roles: [secCasesV2NoReopenWithCreateComment.name],
};

export const secCasesV2NoCreateCommentWithReopenUser: User = {
  username: 'sec_cases_v2_no_create_comment_with_reopen_user_api_int',
  password: 'password',
  roles: [secCasesV2NoCreateCommentWithReopen.name],
};

export const secAllSpace1User: User = {
  username: 'sec_all_space1_user_api_int',
  password: 'password',
  roles: [secAllSpace1.name],
};

export const secAllCasesReadUser: User = {
  username: 'sec_all_cases_read_user_api_int',
  password: 'password',
  roles: [secAllCasesRead.name],
};

export const secAllCasesNoneUser: User = {
  username: 'sec_all_cases_none_user_api_int',
  password: 'password',
  roles: [secAllCasesNone.name],
};

export const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user_api_int',
  password: 'password',
  roles: [secReadCasesAll.name],
};

export const secReadCasesReadUser: User = {
  username: 'sec_read_cases_read_user_api_int',
  password: 'password',
  roles: [secReadCasesRead.name],
};

export const secReadUser: User = {
  username: 'sec_read_user_api_int',
  password: 'password',
  roles: [secRead.name],
};

export const secReadCasesNoneUser: User = {
  username: 'sec_read_cases_none_user_api_int',
  password: 'password',
  roles: [secReadCasesNone.name],
};

/**
 * Users for Cases in the Stack
 */

export const casesOnlyDeleteUser: User = {
  username: 'cases_only_delete_user_api_int',
  password: 'password',
  roles: [casesOnlyDelete.name],
};

export const casesOnlyReadDeleteUser: User = {
  username: 'cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [casesOnlyReadDelete.name],
};

export const casesNoDeleteUser: User = {
  username: 'cases_no_delete_user_api_int',
  password: 'password',
  roles: [casesNoDelete.name],
};

export const casesAllUser: User = {
  username: 'cases_all_user_api_int',
  password: 'password',
  roles: [casesAll.name],
};

export const casesV2AllUser: User = {
  username: 'cases_v2_all_user_api_int',
  password: 'password',
  roles: [casesV2All.name],
};

export const casesV3AllUser: User = {
  username: 'cases_v3_all_user_api_int',
  password: 'password',
  roles: [casesV3All.name],
};

export const casesV3NoAssigneeUser: User = {
  username: 'cases_v3_no_assignee_user_api_int',
  password: 'password',
  roles: [casesV3NoAssignee.name],
};

export const casesV3ReadAndAssignUser: User = {
  username: 'cases_v3_read_and_assignee_user_api_int',
  password: 'password',
  roles: [casesV3ReadAndAssignee.name],
};

export const casesV2NoReopenWithCreateCommentUser: User = {
  username: 'cases_v2_no_reopen_with_create_comment_user_api_int',
  password: 'password',
  roles: [casesV2NoReopenWithCreateComment.name],
};

export const casesV2NoCreateCommentWithReopenUser: User = {
  username: 'cases_v2_no_create_comment_with_reopen_user_api_int',
  password: 'password',
  roles: [casesV2NoCreateCommentWithReopen.name],
};

export const casesReadUser: User = {
  username: 'cases_read_user_api_int',
  password: 'password',
  roles: [casesRead.name],
};

/**
 * Users for Cases in Observability
 */

export const obsCasesOnlyDeleteUser: User = {
  username: 'obs_cases_only_delete_user_api_int',
  password: 'password',
  roles: [obsCasesOnlyDelete.name],
};

export const obsCasesOnlyReadDeleteUser: User = {
  username: 'obs_cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [obsCasesOnlyReadDelete.name],
};

export const obsCasesNoDeleteUser: User = {
  username: 'obs_cases_no_delete_user_api_int',
  password: 'password',
  roles: [obsCasesNoDelete.name],
};

export const obsCasesAllUser: User = {
  username: 'obs_cases_all_user_api_int',
  password: 'password',
  roles: [obsCasesAll.name],
};

export const obsCasesV2AllUser: User = {
  username: 'obs_cases_v2_all_user_api_int',
  password: 'password',
  roles: [obsCasesV2All.name],
};

export const obsCasesV3AllUser: User = {
  username: 'obs_cases_v3_all_user_api_int',
  password: 'password',
  roles: [obsCasesV3All.name],
};

export const obsCasesV2NoReopenWithCreateCommentUser: User = {
  username: 'obs_cases_v2_no_reopen_with_create_comment_user_api_int',
  password: 'password',
  roles: [obsCasesV2NoReopenWithCreateComment.name],
};

export const obsCasesV2NoCreateCommentWithReopenUser: User = {
  username: 'obs_cases_v2_no_create_comment_with_reopen_user_api_int',
  password: 'password',
  roles: [obsCasesV2NoCreateCommentWithReopen.name],
};

export const obsCasesReadUser: User = {
  username: 'obs_cases_read_user_api_int',
  password: 'password',
  roles: [obsCasesRead.name],
};

/**
 * Users for Observability and Security Solution
 */

export const obsSecCasesAllUser: User = {
  username: 'obs_sec_cases_all_user_api_int',
  password: 'password',
  roles: [obsCasesAll.name, secAll.name],
};

export const obsSecCasesReadUser: User = {
  username: 'obs_sec_cases_read_user_api_int',
  password: 'password',
  roles: [obsCasesRead.name, secRead.name],
};

export const users = [
  secAllCasesOnlyDeleteUser,
  secAllCasesOnlyReadDeleteUser,
  secAllCasesNoDeleteUser,
  secAllUser,
  secCasesV2AllUser,
  secCasesV3AllUser,
  secCasesV2NoReopenWithCreateCommentUser,
  secCasesV2NoCreateCommentWithReopenUser,
  secAllSpace1User,
  secAllCasesReadUser,
  secAllCasesNoneUser,
  secReadCasesAllUser,
  secReadCasesReadUser,
  secReadUser,
  secReadCasesNoneUser,
  casesOnlyDeleteUser,
  casesOnlyReadDeleteUser,
  casesNoDeleteUser,
  casesAllUser,
  casesV2AllUser,
  casesV3AllUser,
  casesV3NoAssigneeUser,
  casesV3ReadAndAssignUser,
  casesV2NoReopenWithCreateCommentUser,
  casesV2NoCreateCommentWithReopenUser,
  casesReadUser,
  obsCasesOnlyDeleteUser,
  obsCasesOnlyReadDeleteUser,
  obsCasesNoDeleteUser,
  obsCasesAllUser,
  obsCasesV2AllUser,
  obsCasesV3AllUser,
  obsCasesV2NoReopenWithCreateCommentUser,
  obsCasesV2NoCreateCommentWithReopenUser,
  obsCasesReadUser,
  obsSecCasesAllUser,
  obsSecCasesReadUser,
];
