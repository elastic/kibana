/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { TAGS_FIELD } from '../../../../common/detection_engine/rule_management/rule_fields';
import { EXPECTED_MAX_TAGS } from '../../../lib/detection_engine/rule_management/constants';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

export const DISCOVER_RULE_TAGS_INLINE_TOOL_ID = 'security.discover_rule_tags';

export const discoverRuleTagsSchema = z.object({}).strict();

interface DiscoverRuleTagsToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

export const createDiscoverRuleTagsInlineTool = ({
  getStartServices,
  logger,
}: DiscoverRuleTagsToolDeps): BuiltinSkillBoundedTool<typeof discoverRuleTagsSchema> => ({
  id: DISCOVER_RULE_TAGS_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Discover available tag values across all Security detection rules. ' +
    'Returns tag names and their rule counts. ' +
    'Call this before filtering by tag in `security.find_rules`. ' +
    'Does NOT return rule names or metadata.',
  schema: discoverRuleTagsSchema,
  handler: async (_input, { request }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const findResult = await findRules({
        rulesClient,
        filter: undefined,
        perPage: 0,
        page: 1,
        sortField: undefined,
        sortOrder: undefined,
        fields: undefined,
        aggregations: {
          by_field: { terms: { field: TAGS_FIELD, size: EXPECTED_MAX_TAGS } },
        },
      });

      const aggResult = findResult.aggregations as
        | {
            by_field?: {
              buckets?: Array<{ key: string; doc_count: number }>;
              sum_other_doc_count?: number;
            };
          }
        | undefined;
      const buckets = aggResult?.by_field?.buckets ?? [];
      const otherDocCount = aggResult?.by_field?.sum_other_doc_count ?? 0;
      const truncationHint =
        otherDocCount > 0
          ? ` There are additional groups beyond the top ${buckets.length} (sum_other_doc_count=${otherDocCount}). Surface this limitation to the user before saying a value does not exist.`
          : '';

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: `Discovered rule tag values (${buckets.length} groups).${truncationHint}`,
              field: 'tags',
              groups: buckets.map((b) => ({ value: b.key, count: b.doc_count })),
              truncated: otherDocCount > 0,
              otherDocCount,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(
        `discover_rule_tags tool failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to discover rule tags: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
