/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerResult, ToolHandlerContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ElasticsearchClient } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { IdentifierType } from '../../../../../../common/api/entity_analytics/common/common.gen';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../../../common/entity_analytics/risk_engine';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';

import { ENTITY_ANALYTICS_RISK_SCORE_INLINE_TOOL_ID } from '.';
import { getRiskFieldPaths, intervalToEsql } from './utils';
import { escapeEsqlString } from '../common';

const DEFAULT_LIMIT = 10;

export const riskScoreStaticSchema = z.object({
  entityType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  entityId: z
    .string()
    .describe(
      'The identifier of the entity to retrieve the risk score for. If not provided, the tool will query for the riskiest entities'
    )
    .optional(),
  interval: z
    .string()
    .regex(
      /^\d+[smhdwM]$/,
      `Intervals should follow {value}{unit} where unit is one of s,m,h,d,w,M`
    )
    .describe(
      `The time interval to compare risk scores. Intervals should be in format {value}{unit} where value is a number and unit is one of 's' (second), 'm' (minute), 'h' (hour), 'd' (day), 'w' (week), or 'M' (month)`
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results to return when entityId is not provided (default: 10)'),
});

export type RiskScoreType = Omit<z.infer<typeof riskScoreStaticSchema>, 'entityType'> & {
  entityType: EntityType;
};

type BuildEsqlQueryOpts = RiskScoreType & {
  esClient: ElasticsearchClient;
  latestIndex: string;
  timeseriesIndex: string;
};

export const queryRisks = async (opts: BuildEsqlQueryOpts) => {
  if (opts.interval) {
    return null;
  }

  const entityLimit = opts.limit || DEFAULT_LIMIT;
  const entityId = opts.entityId ? escapeEsqlString(opts.entityId) : null;

  const { scoreField, levelField, idValueField, idFieldField } = getRiskFieldPaths(opts.entityType);

  const query = `FROM ${opts.latestIndex}
  | WHERE ${scoreField} IS NOT NULL${entityId ? ` AND ${idValueField} == "${entityId}"` : ''}
  | KEEP @timestamp, ${scoreField}, ${levelField}, ${idValueField}, ${idFieldField}
  | SORT ${scoreField} DESC
  | LIMIT ${entityLimit}`;

  const { columns, values } = await opts.esClient.esql.query({ query, drop_null_columns: true });

  return [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.esqlResults,
      data: { query, columns, values },
    },
  ];
};

export const queryRisksOverInterval = async (opts: BuildEsqlQueryOpts) => {
  if (!opts.interval) {
    return null;
  }

  const entityLimit = opts.limit || DEFAULT_LIMIT;
  const entityId = opts.entityId ? escapeEsqlString(opts.entityId) : null;

  const { idValueField, scoreField, levelField } = getRiskFieldPaths(opts.entityType);

  const query = `FROM ${opts.timeseriesIndex}
      | WHERE ${scoreField} IS NOT NULL AND @timestamp >= ${intervalToEsql(opts.interval)}${
    entityId ? ` AND ${idValueField} == "${entityId}"` : ''
  }
      | STATS latest_score = LAST(${scoreField}, @timestamp), earliest_score = FIRST(${scoreField}, @timestamp), calculated_level = LAST(${levelField}, @timestamp) BY ${idValueField}
      | EVAL risk_score_change = latest_score - earliest_score
      | EVAL significant_increase = CASE(risk_score_change > 20, true,risk_score_change <= 20, false)
      | SORT risk_score_change DESC
      | LIMIT ${entityLimit}`;

  const { columns, values } = await opts.esClient.esql.query({ query, drop_null_columns: true });

  return [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.esqlResults,
      data: { query, columns, values },
    },
  ];
};

const QUERY_FNS = [queryRisks, queryRisksOverInterval];

const applyEsqlQueries = async (opts: BuildEsqlQueryOpts) => {
  if (!opts.entityType) {
    throw new Error('entityType is required');
  }

  const results: ToolHandlerResult[] = [];

  await asyncForEach(QUERY_FNS, async (queryFn) => {
    const queryResult = await queryFn(opts);
    if (queryResult != null) {
      results.push(...queryResult);
    }
  });

  return results;
};

export const riskScoreStaticInlineToolHandler = async (
  toolArgs: RiskScoreType,
  toolContext: ToolHandlerContext & EntityAnalyticsSkillsContext
) => {
  try {
    const { esClient, logger, spaceId } = toolContext;

    logger.info(
      `${ENTITY_ANALYTICS_RISK_SCORE_INLINE_TOOL_ID} tool called with args: ${JSON.stringify(
        toolArgs
      )}`
    );

    // TODO - should switch to using the entity store for the latest info when we switch over.
    const riskScoreIndexPattern = getRiskScoreLatestIndex(spaceId);
    const riskScoreTimeSeriesIndexPattern = getRiskScoreTimeSeriesIndex(spaceId);

    const indexExists = await esClient.asInternalUser.indices.exists({
      index: riskScoreIndexPattern,
    });

    if (!indexExists) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Risk score index does not exist for this space. The user needs to enable the risk engine so that this agent can answer risk-related questions.`,
            },
          },
        ],
      };
    }

    // Form an ES|QL query based on the inputs
    const results = await applyEsqlQueries({
      ...toolArgs,
      esClient: esClient.asCurrentUser,
      latestIndex: riskScoreIndexPattern,
      timeseriesIndex: riskScoreTimeSeriesIndexPattern,
    });

    return { results };
  } catch (error) {
    return {
      results: [
        {
          type: ToolResultType.error,
          data: {
            error: `Error retrieving entity analytics data: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        },
      ],
    };
  }
};

export const getRiskScoreInlineTool = (ctx: EntityAnalyticsSkillsContext): SkillBoundedTool => ({
  id: ENTITY_ANALYTICS_RISK_SCORE_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: riskScoreStaticSchema,
  description: `Call this tool to get the latest entity risk score and the inputs that contributed to the calculation for a specific entity (host, user, service, or generic). IMPORTANT: Always use 'calculated_score_norm' (0-100) when reporting risk scores, NOT 'calculated_score' which is a raw value. The 'calculated_score_norm' field is the normalized score suitable for comparison between entities. The 'modifiers' array contains risk adjustments such as asset criticality and privileged user monitoring (watchlist/privmon type).`,
  handler: async (args, context) =>
    riskScoreStaticInlineToolHandler(args as RiskScoreType, { ...context, ...ctx }),
});
