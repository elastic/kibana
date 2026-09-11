/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from '@kbn/zod/v4';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { ToolType } from '@kbn/agent-builder-common';
import { actionCategorySchema } from '@kbn/workflows/managed';
import { ALERTZERO_ACTIONS_LIST_BY_CATEGORY_TOOL_ID } from '@kbn/alertzero-common';
import type { ActionsService } from '../services/actions/actions_service';

const listByCategorySchema = z.object({
  categories: z
    .array(actionCategorySchema)
    .max(20)
    .optional()
    .describe(
      'Category keywords to filter on (e.g. ["contain", "escalate"]). An action is returned when its declared category matches ANY of these. Omit to list every available action.'
    ),
});

/**
 * `security.alertzero.actions.listByCategory` — lets an agent discover the
 * installed action workflows at runtime instead of hard-coding workflow ids.
 *
 * Registered by the AlertZero plugin (setup), reads the catalog through
 * {@link ActionsService} — the same service backing the HTTP API — so the tool
 * and the API can never drift.
 */
export const listActionsByCategoryTool = (
  getActionsService: () => ActionsService
): BuiltinToolDefinition<typeof listByCategorySchema> => ({
  id: ALERTZERO_ACTIONS_LIST_BY_CATEGORY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'List available AlertZero actions, optionally filtered by category. Each result includes the workflowId to reference when proposing the action, plus its name, description, category, impact (low/medium/high/critical) and approvalPolicy (always-gate/autonomy-dependent). Call this before proposing an action so the proposal references a real, installed workflow.',
  annotations: {
    title: 'List AlertZero Actions',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: listByCategorySchema,
  tags: ['alertzero'],
  handler: async ({ categories }, { logger }) => {
    try {
      const { actions, total } = await getActionsService().list('default', categories);
      const message =
        total === 0
          ? categories
            ? `No actions found in categories: ${categories.join(', ')}.`
            : 'No actions are installed.'
          : undefined;
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total,
              actions,
              ...(message && { message }),
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[List Actions Tool] Error listing actions: ${errorMessage}`);
      return {
        results: [createErrorResult(`Error listing actions: ${errorMessage}`)],
      };
    }
  },
});
