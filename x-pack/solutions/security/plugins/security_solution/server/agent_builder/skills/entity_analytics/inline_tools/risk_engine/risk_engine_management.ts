/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { RiskEngineDataClient } from '../../../../../lib/entity_analytics/risk_engine/risk_engine_data_client';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';

import { RISK_ENGINE_MANAGEMENT_INLINE_TOOL_ID } from '.';

const riskEngineManagementSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('status').describe('Get the current risk engine status (read-only)'),
  }),
  z.object({
    operation: z.literal('enable').describe('Enable the risk engine'),
    confirm: z.literal(true).describe('Required. Must be true to enable.'),
  }),
  z.object({
    operation: z.literal('disable').describe('Disable the risk engine'),
    confirm: z.literal(true).describe('Required. Must be true to disable.'),
  }),
  z.object({
    operation: z.literal('schedule_now').describe('Trigger an immediate risk score calculation'),
    confirm: z.literal(true).describe('Required. Must be true to schedule.'),
  }),
]);

const createRiskEngineClient = (
  ctx: EntityAnalyticsSkillsContext,
  handlerCtx: {
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    spaceId: string;
    logger: Logger;
  }
) =>
  new RiskEngineDataClient({
    logger: handlerCtx.logger,
    kibanaVersion: ctx.kibanaVersion,
    esClient: handlerCtx.esClient,
    namespace: handlerCtx.spaceId,
    soClient: handlerCtx.savedObjectsClient,
    auditLogger: undefined,
  });

export const getRiskEngineManagementInlineTool = (
  ctx: EntityAnalyticsSkillsContext
): SkillBoundedTool => ({
  id: RISK_ENGINE_MANAGEMENT_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: riskEngineManagementSchema as unknown as z.ZodObject<any>,
  description:
    'Manage the risk engine lifecycle: check status, enable, disable, or trigger an immediate risk score calculation.',
  handler: async (input, { esClient, spaceId, logger, savedObjectsClient }) => {
    try {
      logger.info(
        `${RISK_ENGINE_MANAGEMENT_INLINE_TOOL_ID} tool called with operation: ${input.operation}`
      );

      const [, startPlugins] = await ctx.getStartServices();
      const taskManager = startPlugins.taskManager;
      const riskEngineClient = createRiskEngineClient(ctx, {
        esClient: esClient.asCurrentUser,
        savedObjectsClient,
        spaceId,
        logger,
      });

      const { operation } = input;

      if (operation === 'status') {
        const { riskEngineStatus, taskStatus } = await riskEngineClient.getStatus({
          namespace: spaceId,
          taskManager,
        });
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                operation: 'status',
                risk_engine_status: riskEngineStatus,
                risk_engine_task_status: taskStatus,
              },
            },
          ],
        };
      }

      if (!taskManager) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Task Manager is not available. Cannot ${operation} risk engine.`,
              },
            },
          ],
        };
      }

      switch (operation) {
        case 'enable':
          await riskEngineClient.enableRiskEngine({ taskManager });
          break;
        case 'disable':
          await riskEngineClient.disableRiskEngine({ taskManager });
          break;
        case 'schedule_now':
          await riskEngineClient.scheduleNow({ taskManager });
          break;
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              operation,
              message: `Risk engine ${operation} completed successfully`,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Error managing risk engine: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          },
        ],
      };
    }
  },
});
