/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseAction } from '../../../../../common/api/detection_engine/model/rule_response_actions';
import {
  OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH,
  OVER_LIMIT_OSQUERY_QUERY_LENGTH,
} from '../../../../../common/api/detection_engine/model/rule_response_actions/response_actions.mock';
import { getQueryRuleParams } from './rule_schemas.mock';
import { QueryRuleParams } from './rule_schemas';

const overLimitQuery = 'select * from processes;'.padEnd(OVER_LIMIT_OSQUERY_QUERY_LENGTH, 'a');

describe('rule param schemas', () => {
  test('keeps API response action bounds while accepting legacy stored response action params', () => {
    expect(
      ResponseAction.safeParse({
        action_type_id: '.osquery',
        params: {
          query: overLimitQuery,
        },
      }).success
    ).toBe(false);

    const storedRuleParams = QueryRuleParams.safeParse(
      getQueryRuleParams({
        responseActions: [
          {
            actionTypeId: '.osquery',
            params: {
              query: overLimitQuery,
            },
          },
        ],
      })
    );

    expect(overLimitQuery.length).toBeGreaterThan(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH);
    expect(storedRuleParams.success).toBe(true);
  });
});
