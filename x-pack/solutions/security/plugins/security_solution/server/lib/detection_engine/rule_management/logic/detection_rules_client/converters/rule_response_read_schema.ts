/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod/v4';
import type { RequiredOptional } from '@kbn/zod-helpers/v4';
import {
  RuleResponse,
  type RuleResponse as RuleResponseType,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';

type RuleResponseParseResult =
  | { success: true; data: RuleResponseType }
  | { success: false; error: z.ZodError };

const ReadResponseActionEcsMapping = z.object({}).catchall(
  z.object({
    field: z.string().optional(),
    value: z.union([z.string(), z.array(z.string())]).optional(),
  })
);

const ReadOsqueryQuery = z.object({
  id: z.string(),
  query: z.string(),
  ecs_mapping: ReadResponseActionEcsMapping.optional(),
  version: z.string().optional(),
  platform: z.string().optional(),
  removed: z.boolean().optional(),
  snapshot: z.boolean().optional(),
});

const ReadOsqueryParams = z.object({
  query: z.string().optional(),
  ecs_mapping: ReadResponseActionEcsMapping.optional(),
  queries: z.array(ReadOsqueryQuery).optional(),
  pack_id: z.string().optional(),
  saved_query_id: z.string().optional(),
  timeout: z.number().optional(),
});

const ReadOsqueryResponseAction = z.object({
  action_type_id: z.literal('.osquery'),
  params: ReadOsqueryParams,
});

const ReadEndpointDefaultParams = z.object({
  command: z.literal('isolate'),
  comment: z.string().optional(),
});

const ReadEndpointRunScriptOsConfigValues = z.object({
  scriptId: z.string().optional(),
  scriptInput: z.string().optional(),
  timeout: z.number().int().optional(),
});

const ReadEndpointRunscriptParams = z.object({
  command: z.literal('runscript'),
  comment: z.string().optional(),
  config: z
    .object({
      linux: ReadEndpointRunScriptOsConfigValues.optional(),
      macos: ReadEndpointRunScriptOsConfigValues.optional(),
      windows: ReadEndpointRunScriptOsConfigValues.optional(),
    })
    .optional(),
});

const ReadEndpointProcessesParams = z.object({
  command: z.enum(['kill-process', 'suspend-process']),
  comment: z.string().optional(),
  config: z.object({
    field: z.string(),
    overwrite: z.boolean().optional().default(true),
  }),
});

const ReadEndpointResponseAction = z.object({
  action_type_id: z.literal('.endpoint'),
  params: z.union([
    ReadEndpointDefaultParams,
    ReadEndpointProcessesParams,
    ReadEndpointRunscriptParams,
  ]),
});

const ReadResponseAction = z.discriminatedUnion('action_type_id', [
  ReadOsqueryResponseAction,
  ReadEndpointResponseAction,
]);

const ReadResponseActions = z.array(ReadResponseAction);

export const safeParseRuleResponseForRead = (
  ruleResponse: RequiredOptional<RuleResponseType>
): RuleResponseParseResult => {
  const { response_actions: responseActions, ...ruleResponseWithoutResponseActions } = ruleResponse;
  const ruleResponseParseResult = RuleResponse.safeParse(ruleResponseWithoutResponseActions);

  if (!ruleResponseParseResult.success) {
    return ruleResponseParseResult;
  }

  if (responseActions === undefined) {
    return ruleResponseParseResult;
  }

  const responseActionsParseResult = ReadResponseActions.safeParse(responseActions);

  if (!responseActionsParseResult.success) {
    return responseActionsParseResult;
  }

  return {
    success: true,
    data: {
      ...ruleResponseParseResult.data,
      response_actions: responseActionsParseResult.data,
    },
  };
};
