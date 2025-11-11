/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import type { PathToolClient } from '../path_tool_client';

export const OBSERVABILITY_EXECUTE_PATHS_TOOL_ID = 'observability.execute_paths';

const createPathSchema = (names: string[] = []) =>
  z.object({
    pathName: z.string(),
    prompt: z.string().describe('prompt to query kibana or elasticsearch'),
  });
export async function createObservabilityExecutePathsTool({
  core,
  plugins,
  logger,
  observabilityPathToolClient,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
  observabilityPathToolClient: PathToolClient;
}) {
  const paths = observabilityPathToolClient.getPaths();
  const pathSchema = createPathSchema(paths.map((p) => p.name));

  const toolDefinition: BuiltinToolDefinition<typeof pathSchema> = {
    id: OBSERVABILITY_EXECUTE_PATHS_TOOL_ID,
    type: ToolType.builtin,
    description: 'Execute predefined observability paths to solve common tasks',
    schema: pathSchema,
    tags: ['observability'],
    handler: async ({ pathName, prompt }, toolHandlerContext) => {
      logger.debug(`Executing ${OBSERVABILITY_EXECUTE_PATHS_TOOL_ID}, with paths: ${pathName}`);
      const response = await observabilityPathToolClient.executePath(pathName, {
        prompt,
        toolHandlerContext,
      });
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { pathName, response },
          },
        ],
      };
    },
  };
  return toolDefinition;
}
