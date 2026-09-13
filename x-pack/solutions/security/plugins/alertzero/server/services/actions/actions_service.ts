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

import { ACTION_WORKFLOW_TAG, actionMetadataSchema } from '@kbn/workflows/managed';
import type { WorkflowListDto } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import type { ActionCatalogEntry, ListActionsResponse } from '@kbn/alertzero-common';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';

/** Structural subset of WorkflowListItemDto.definition the catalog reads. */
interface ActionWorkflowDefinition {
  consts?: { actionMetadata?: unknown };
}

const PAGE_SIZE = 100;

/**
 * Action catalog service: lists installed action workflows and projects them to
 * the lightweight {@link ActionCatalogEntry} shape.
 *
 * Discovery is tag-driven (`action`), never a hardcoded workflow-id list, and
 * category is a solution-owned keyword — never validated against an enum.
 * Definitions declaring invalid `consts.actionMetadata` are skipped with a
 * warning rather than failing the whole catalog.
 */
export class ActionsService {
  constructor(
    private readonly getManagement: () => WatchWorkflowsManagementClient | undefined,
    private readonly logger: Logger
  ) {}

  async list(spaceId: string, categories?: string[]): Promise<ListActionsResponse> {
    const management = this.getManagement();
    if (!management) {
      throw new Error('Workflows management is not available');
    }

    const filter = categories && categories.length > 0 ? new Set(categories) : undefined;

    const actions: ActionCatalogEntry[] = [];
    let page = 1;
    // Page until exhausted. The catalog is small (installed action workflows),
    // so the loop is bounded by the number of action workflows, not all workflows:
    // the tag filter runs server-side inside getWorkflows.
    for (;;) {
      const response: WorkflowListDto = await management.getWorkflows(
        {
          tags: [ACTION_WORKFLOW_TAG],
          page,
          size: PAGE_SIZE,
          // Action workflows are managed installs (global space); the search
          // service's `unmanaged` default would filter them all out.
          managedFilter: 'managed',
        },
        spaceId
      );
      for (const item of response.results) {
        const entry = this.toEntry(item.id, item.definition as ActionWorkflowDefinition | null);
        if (!entry) {
          continue;
        }
        if (filter && (entry.category === undefined || !filter.has(entry.category))) {
          continue;
        }
        actions.push(entry);
      }
      if (page * PAGE_SIZE >= response.total) {
        break;
      }
      page += 1;
    }

    actions.sort((a, b) => a.name.localeCompare(b.name));
    return { actions, total: actions.length };
  }

  /**
   * Projects a workflow definition to a catalog entry, or `undefined` when the
   * definition carries no parseable `consts.actionMetadata`.
   */
  private toEntry(
    workflowId: string,
    definition: ActionWorkflowDefinition | null
  ): ActionCatalogEntry | undefined {
    const candidate = definition?.consts?.actionMetadata;
    if (candidate === undefined) {
      return undefined;
    }
    const parsed = actionMetadataSchema.safeParse(candidate);
    if (!parsed.success) {
      this.logger.warn(
        `Action workflow [${workflowId}] declares invalid consts.actionMetadata: ${parsed.error.message}`
      );
      return undefined;
    }
    const { name, description, category, impact, approvalPolicy } = parsed.data;
    return {
      workflowId,
      name,
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(impact !== undefined && { impact }),
      ...(approvalPolicy !== undefined && { approvalPolicy }),
    };
  }
}
