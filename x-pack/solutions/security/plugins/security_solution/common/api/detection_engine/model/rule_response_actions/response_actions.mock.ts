/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryResponseAction } from './response_actions.gen';

export const OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH = 10_000;
export const OVER_LIMIT_OSQUERY_QUERY_LENGTH = OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH * 2;
export const OSQUERY_QUERY_OVER_LIMIT_FIELD_PATH = 'response_actions.0.params.query';

export const getOverLimitOsqueryResponseActionMock = (): OsqueryResponseAction => ({
  action_type_id: '.osquery',
  params: {
    query: 'select * from processes;'.padEnd(OVER_LIMIT_OSQUERY_QUERY_LENGTH, 'a'),
  },
});
