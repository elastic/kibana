/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import {
  OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH,
  OVER_LIMIT_OSQUERY_QUERY_LENGTH,
} from '../../../../../../../common/api/detection_engine/model/rule_response_actions/response_actions.mock';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { getRuleMock } from '../../../../routes/__mocks__/request_responses';
import { RuleResponseValidationError } from '../utils';
import { convertAlertingRuleToRuleResponse } from './convert_alerting_rule_to_rule_response';
import { internalRuleToAPIResponse } from './internal_rule_to_api_response';

const overLimitOsqueryQuery = 'select * from processes;'.padEnd(
  OVER_LIMIT_OSQUERY_QUERY_LENGTH,
  'a'
);

describe('convertAlertingRuleToRuleResponse', () => {
  it('reads stored rules with legacy over-limit osquery response action params', () => {
    const queries = Array.from({ length: 101 }, (_, index) => ({
      id: `query-${index}`,
      query: `select ${index};`,
    }));
    const rule = getRuleMock(
      getQueryRuleParams({
        responseActions: [
          {
            actionTypeId: '.osquery',
            params: {
              query: overLimitOsqueryQuery,
              queries,
            },
          },
        ],
      })
    );

    expect(RuleResponse.safeParse(internalRuleToAPIResponse(rule)).success).toBe(false);

    const result = convertAlertingRuleToRuleResponse(rule);

    expect(overLimitOsqueryQuery.length).toBeGreaterThan(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH);
    expect(result.response_actions?.[0]).toMatchObject({
      action_type_id: '.osquery',
      params: {
        query: overLimitOsqueryQuery,
        queries,
      },
    });
  });

  it('reads stored rules with legacy over-limit endpoint response action params', () => {
    const comment = 'Investigate endpoint'.padEnd(10_001, 'a');
    const scriptInput = 'arg'.padEnd(8_193, 'a');
    const rule = getRuleMock(
      getQueryRuleParams({
        responseActions: [
          {
            actionTypeId: '.endpoint',
            params: {
              command: 'runscript',
              comment,
              config: {
                linux: {
                  scriptInput,
                },
              },
            },
          },
        ],
      })
    );

    expect(RuleResponse.safeParse(internalRuleToAPIResponse(rule)).success).toBe(false);

    const result = convertAlertingRuleToRuleResponse(rule);

    expect(result.response_actions).toEqual([
      {
        action_type_id: '.endpoint',
        params: {
          command: 'runscript',
          comment,
          config: {
            linux: {
              scriptInput,
            },
          },
        },
      },
    ]);
  });

  it('rejects stored rules with malformed response action params', () => {
    const rule = getRuleMock(
      getQueryRuleParams({
        responseActions: [
          {
            actionTypeId: '.endpoint',
            params: {
              command: 'runscript',
              config: {
                linux: {
                  timeout: 'sixty',
                },
              },
            },
          } as never,
        ],
      })
    );

    expect(() => convertAlertingRuleToRuleResponse(rule)).toThrow(RuleResponseValidationError);
  });
});
