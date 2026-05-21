/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { TAGS_FIELD } from '../../../../common/detection_engine/rule_management/rule_fields';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import {
  andGroupSchema,
  buildAggregationResult,
  buildFullFilter,
  EXCLUDE_DESCRIPTION,
  FILTER_DESCRIPTION,
  GROUP_BY_TERMS_SIZE,
  type FindRulesToolDeps,
  type TermsAggregationResult,
} from './rule_filter';

export const DISCOVER_RULE_TAGS_INLINE_TOOL_ID = 'security.discover_rule_tags';

export const discoverRuleTagsSchema = z
  .object({
    filter: z.array(andGroupSchema).optional().describe(FILTER_DESCRIPTION),
    exclude: z.array(andGroupSchema).optional().describe(EXCLUDE_DESCRIPTION),
  })
  .strict();

export const createDiscoverRuleTagsInlineTool = ({
  getStartServices,
  logger,
}: FindRulesToolDeps): BuiltinSkillBoundedTool<typeof discoverRuleTagsSchema> => ({
  id: DISCOVER_RULE_TAGS_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Discover available tag values across Security detection rules. ' +
    'Returns tag names and their rule counts — use this before filtering by tag in `security.find_rules`. ' +
    'Does NOT return rule names or metadata.',
  schema: discoverRuleTagsSchema,
  handler: async (input, { request }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const kqlFilter = buildFullFilter(input.filter, input.exclude);

      const findResult = await findRules({
        rulesClient,
        filter: kqlFilter,
        perPage: 0,
        page: 1,
        sortField: undefined,
        sortOrder: undefined,
        fields: undefined,
        aggregations: {
          by_field: { terms: { field: TAGS_FIELD, size: GROUP_BY_TERMS_SIZE } },
        },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              ...buildAggregationResult({
                label: 'tags',
                message: 'Discovered rule tag values',
                aggResult: findResult.aggregations as TermsAggregationResult | undefined,
              }),
              mode: 'tag_discovery',
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
