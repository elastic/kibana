/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers/v4';
import type { ZodType } from '@kbn/zod/v4';

import { CreateRuleRequestBody } from '../../rule_management/crud/create_rule/create_rule_route.gen';
import { PatchRuleRequestBody } from '../../rule_management/crud/patch_rule/patch_rule_route.gen';
import { getPatchRulesSchemaMock } from '../../rule_management/crud/patch_rule/patch_rule_route.mock';
import { UpdateRuleRequestBody } from '../../rule_management/crud/update_rule/update_rule_route.gen';
import { RuleToImport } from '../../rule_management/import_rules/rule_to_import';
import { getImportRulesSchemaMock } from '../../rule_management/import_rules/rule_to_import.mock';
import { RulePreviewRequestBody } from '../../rule_preview';
import { RuleResponse } from '../rule_schema';
import { getCreateRulesSchemaMock, getUpdateRulesSchemaMock } from '../rule_schema/mocks';
import { getRulesSchemaMock } from '../rule_schema/rule_response_schema.mock';
import { ResponseAction, RuleResponseAction } from './response_actions.gen';

const OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH = 30_000;
const OSQUERY_RESPONSE_ACTION_QUERIES_MAX_ITEMS = 1_000;
const ENDPOINT_RESPONSE_ACTION_COMMENT_MAX_LENGTH = 30_000;
const PROCESS_CONFIG_FIELD_MAX_LENGTH = 2_000;
const RUN_SCRIPT_ID_MAX_LENGTH = 256;
const RUN_SCRIPT_INPUT_MAX_LENGTH = 8_192;
const OSQUERY_ID_LIKE_MAX_LENGTH = 256;
const ECS_MAPPING_FIELD_MAX_LENGTH = 2_000;
const ECS_MAPPING_VALUE_MAX_LENGTH = 30_000;
const ECS_MAPPING_VALUE_MAX_ITEMS = 1_000;
const OSQUERY_QUERY_OVER_LIMIT_FIELD_PATH = 'response_actions.0.params.query';

const exactLengthString = (length: number): string => 'a'.repeat(length);

const getAtLimitOsqueryResponseAction = () => ({
  action_type_id: '.osquery' as const,
  params: {
    query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH),
  },
});

const getOverLimitOsqueryResponseAction = () => ({
  action_type_id: '.osquery' as const,
  params: {
    query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH + 1),
  },
});

const API_SURFACES: Array<{
  name: string;
  schema: ZodType<unknown>;
  fixture: () => Record<string, unknown>;
}> = [
  {
    name: 'CreateRuleRequestBody',
    schema: CreateRuleRequestBody,
    fixture: () => getCreateRulesSchemaMock(),
  },
  {
    name: 'UpdateRuleRequestBody',
    schema: UpdateRuleRequestBody,
    fixture: () => getUpdateRulesSchemaMock(),
  },
  {
    name: 'PatchRuleRequestBody',
    schema: PatchRuleRequestBody,
    fixture: () => getPatchRulesSchemaMock(),
  },
  {
    name: 'RulePreviewRequestBody',
    schema: RulePreviewRequestBody,
    fixture: () => ({
      ...getCreateRulesSchemaMock(),
      invocationCount: 1,
      timeframeEnd: '2024-01-01T00:00:00.000Z',
    }),
  },
  {
    name: 'RuleToImport',
    schema: RuleToImport,
    fixture: () => getImportRulesSchemaMock(),
  },
];

describe('response action schema bounds', () => {
  test('accepts exact-limit representative strings and arrays on both shared shapes', () => {
    const atLimitOsquery = {
      action_type_id: '.osquery' as const,
      params: {
        query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH),
        pack_id: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH),
        saved_query_id: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH),
        queries: Array.from({ length: OSQUERY_RESPONSE_ACTION_QUERIES_MAX_ITEMS }, (_, index) => ({
          id: `q-${index}`,
          query: 'select 1;',
        })),
        ecs_mapping: {
          'process.pid': {
            field: exactLengthString(ECS_MAPPING_FIELD_MAX_LENGTH),
            value: exactLengthString(ECS_MAPPING_VALUE_MAX_LENGTH),
          },
          'process.args': {
            value: Array.from({ length: ECS_MAPPING_VALUE_MAX_ITEMS }, () => 'v'),
          },
        },
      },
    };
    const atLimitEndpoint = {
      action_type_id: '.endpoint' as const,
      params: {
        command: 'kill-process' as const,
        comment: exactLengthString(ENDPOINT_RESPONSE_ACTION_COMMENT_MAX_LENGTH),
        config: {
          field: exactLengthString(PROCESS_CONFIG_FIELD_MAX_LENGTH),
          kill_descendants: true,
        },
      },
    };
    const atLimitRunscript = {
      action_type_id: '.endpoint' as const,
      params: {
        command: 'runscript' as const,
        config: {
          linux: {
            scriptId: exactLengthString(RUN_SCRIPT_ID_MAX_LENGTH),
            scriptInput: exactLengthString(RUN_SCRIPT_INPUT_MAX_LENGTH),
          },
        },
      },
    };
    const atLimitCamelQuery = {
      actionTypeId: '.osquery' as const,
      params: {
        query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH),
        packId: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH),
        savedQueryId: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH),
        queries: Array.from({ length: OSQUERY_RESPONSE_ACTION_QUERIES_MAX_ITEMS }, (_, index) => ({
          id: `q-${index}`,
          query: 'select 1;',
        })),
      },
    };

    expectParseSuccess(ResponseAction.safeParse(atLimitOsquery));
    expectParseSuccess(ResponseAction.safeParse(atLimitEndpoint));
    expectParseSuccess(ResponseAction.safeParse(atLimitRunscript));
    expectParseSuccess(RuleResponseAction.safeParse(atLimitCamelQuery));
  });

  test('rejects over-limit representative values on both shared shapes', () => {
    const overLimitCases: Array<{ schema: ZodType<unknown>; value: unknown; limitText: string }> = [
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: { query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH + 1) },
        },
        limitText: String(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH),
      },
      {
        schema: RuleResponseAction,
        value: {
          actionTypeId: '.osquery',
          params: { query: exactLengthString(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH + 1) },
        },
        limitText: String(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: {
            queries: Array.from(
              { length: OSQUERY_RESPONSE_ACTION_QUERIES_MAX_ITEMS + 1 },
              (_, index) => ({ id: `q-${index}`, query: 'select 1;' })
            ),
          },
        },
        limitText: String(OSQUERY_RESPONSE_ACTION_QUERIES_MAX_ITEMS),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: {
            queries: [
              { id: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH + 1), query: 'select 1;' },
            ],
          },
        },
        limitText: String(OSQUERY_ID_LIKE_MAX_LENGTH),
      },
      {
        schema: RuleResponseAction,
        value: {
          actionTypeId: '.osquery',
          params: { packId: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH + 1) },
        },
        limitText: String(OSQUERY_ID_LIKE_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: {
            ecs_mapping: {
              'process.pid': { field: exactLengthString(ECS_MAPPING_FIELD_MAX_LENGTH + 1) },
            },
          },
        },
        limitText: String(ECS_MAPPING_FIELD_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: {
            ecs_mapping: {
              'process.pid': { value: exactLengthString(ECS_MAPPING_VALUE_MAX_LENGTH + 1) },
            },
          },
        },
        limitText: String(ECS_MAPPING_VALUE_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.osquery',
          params: {
            ecs_mapping: {
              'process.args': {
                value: Array.from({ length: ECS_MAPPING_VALUE_MAX_ITEMS + 1 }, () => 'v'),
              },
            },
          },
        },
        limitText: String(ECS_MAPPING_VALUE_MAX_ITEMS),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.endpoint',
          params: {
            command: 'isolate',
            comment: exactLengthString(ENDPOINT_RESPONSE_ACTION_COMMENT_MAX_LENGTH + 1),
          },
        },
        limitText: String(ENDPOINT_RESPONSE_ACTION_COMMENT_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.endpoint',
          params: {
            command: 'kill-process',
            config: { field: exactLengthString(PROCESS_CONFIG_FIELD_MAX_LENGTH + 1) },
          },
        },
        limitText: String(PROCESS_CONFIG_FIELD_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.endpoint',
          params: {
            command: 'runscript',
            config: {
              linux: {
                scriptId: exactLengthString(RUN_SCRIPT_ID_MAX_LENGTH + 1),
              },
            },
          },
        },
        limitText: String(RUN_SCRIPT_ID_MAX_LENGTH),
      },
      {
        schema: ResponseAction,
        value: {
          action_type_id: '.endpoint',
          params: {
            command: 'runscript',
            config: {
              linux: {
                scriptId: 'script-1',
                scriptInput: exactLengthString(RUN_SCRIPT_INPUT_MAX_LENGTH + 1),
              },
            },
          },
        },
        limitText: String(RUN_SCRIPT_INPUT_MAX_LENGTH),
      },
    ];

    for (const { schema, value, limitText } of overLimitCases) {
      const result = schema.safeParse(value);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain(limitText);
    }
  });

  test('rejects an over-limit stored ID-like value on the shared read schema (RuleResponse)', () => {
    const overLimitStoredRule = {
      ...getRulesSchemaMock(),
      response_actions: [
        {
          action_type_id: '.osquery',
          params: { pack_id: exactLengthString(OSQUERY_ID_LIKE_MAX_LENGTH + 1) },
        },
      ],
    };

    const result = RuleResponse.safeParse(overLimitStoredRule);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('pack_id');
    expect(stringifyZodError(result.error)).toContain(String(OSQUERY_ID_LIKE_MAX_LENGTH));
  });

  describe.each(API_SURFACES)('$name', ({ schema, fixture }) => {
    test('accepts an exact-limit osquery query', () => {
      expectParseSuccess(
        schema.safeParse({
          ...fixture(),
          response_actions: [getAtLimitOsqueryResponseAction()],
        })
      );
    });

    test('rejects an over-limit osquery query', () => {
      const result = schema.safeParse({
        ...fixture(),
        response_actions: [getOverLimitOsqueryResponseAction()],
      });

      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain(OSQUERY_QUERY_OVER_LIMIT_FIELD_PATH);
      expect(stringifyZodError(result.error)).toContain(
        String(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH)
      );
    });
  });
});
