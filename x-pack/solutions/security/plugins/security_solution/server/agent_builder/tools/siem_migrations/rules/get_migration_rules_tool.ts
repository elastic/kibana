/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../common/siem_migrations/constants';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import {
  GetRuleMigrationRulesRequestQuery,
  type GetRuleMigrationRulesResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError, createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID } from './tool_ids';

// Valid sort fields from `server/lib/siem_migrations/rules/data/sort.ts` `sortingOptionsMap`.
// An invalid field causes a silent fallback to DEFAULT_SORTING on the server — narrow to an enum
// so the model always sends a valid value and gets the order it expects.
const SORT_FIELDS = [
  'elastic_rule.title',
  'elastic_rule.severity',
  'elastic_rule.risk_score',
  'elastic_rule.prebuilt_rule_id',
  'translation_result',
  'updated_at',
] as const;

// Extend the OpenAPI-generated query schema, bounding the unbounded inputs (repo rule: prevent
// unbounded-input DoS). `page` is ZERO-BASED — the route computes `from: page * size`
// (api/rules/get.ts), so `page=0` is the first page. `ids` is redefined as a plain array
// (the route validates arrays; the API model's `ArrayFromString` string-split preprocess is
// dropped — a deliberate divergence called out in the plan). Sort fields are narrowed to the
// server's allow-list so an invalid value cannot cause a silent fallback.
const schema = GetRuleMigrationRulesRequestQuery.extend({
  migration_id: NonEmptyString.describe('REQUIRED. The id of the rule migration whose rules to retrieve.'),
  page: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('OPTIONAL. Zero-based page number. Defaults to 0 — omit unless paginating past the first page.'),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe('OPTIONAL. Number of rules per page (1-200). Defaults to 50 — omit unless you need a different page size.'),
  search_term: z.string().max(500).optional().describe('OPTIONAL. Free-text search term to filter rules by name or content. Omit entirely if not searching by text — do not pass an empty string.'),
  ids: z.array(NonEmptyString).max(200).optional().describe('OPTIONAL. Fetch specific rules by their ids. Omit entirely if not filtering by id — do not pass an empty array. When provided, no other filter param is needed.'),
  sort_field: z
    .enum(SORT_FIELDS)
    .optional()
    .describe(
      `OPTIONAL. Field to sort by. One of: ${SORT_FIELDS.join(', ')}. ` +
      'Defaults to translation_result (desc) — omit unless you need a different sort order.'
    ),
  sort_direction: z.enum(['asc', 'desc']).optional().describe('OPTIONAL. Sort direction: asc or desc. Defaults to desc — omit unless you need ascending order.'),
  is_prebuilt: z.boolean().optional().describe('OPTIONAL. true = only rules with a prebuilt match; false = only rules without one. Omit entirely when not filtering by this condition.'),
  is_installed: z.boolean().optional().describe('OPTIONAL. true = installed rules only; false = not-yet-installed only. Omit entirely when not filtering by this condition.'),
  is_fully_translated: z.boolean().optional().describe('OPTIONAL. true = fully translated rules only; false = exclude fully translated. Omit entirely when not filtering by this condition.'),
  is_partially_translated: z.boolean().optional().describe('OPTIONAL. true = partially translated rules only; false = exclude partially translated. Omit entirely when not filtering by this condition.'),
  is_untranslatable: z.boolean().optional().describe('OPTIONAL. true = untranslatable rules only; false = exclude untranslatable. Omit entirely when not filtering by this condition.'),
  is_failed: z.boolean().optional().describe('OPTIONAL. true = failed-translation rules only; false = exclude failed. Omit entirely when not filtering by this condition.'),
  is_missing_index: z.boolean().optional().describe('OPTIONAL. true = rules missing a required index only; false = exclude those. Omit entirely when not filtering by this condition.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_RULES_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

const projectRule = (rule: GetRuleMigrationRulesResponse['data'][number]) => ({
  id: rule.id,
  original_rule: {
    title: rule.original_rule.title,
    vendor: rule.original_rule.vendor,
    query: rule.original_rule.query,
    query_language: rule.original_rule.query_language,
  },
  elastic_rule: rule.elastic_rule
    ? {
      title: rule.elastic_rule.title,
      prebuilt_rule_id: rule.elastic_rule.prebuilt_rule_id,
      integration_ids: rule.elastic_rule.integration_ids,
      query: rule.elastic_rule.query,
      query_language: rule.elastic_rule.query_language,
    }
    : undefined,
  translation_result: rule.translation_result,
  status: rule.status,
});

export const getMigrationRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Migration Rules',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `List the rules in an Automatic Rule Migration with their translation result and status.

Only include the parameters you actually need. Boolean filter fields (is_fully_translated, is_failed, etc.) filter when set — omit them entirely when you are not filtering by that condition. Omit search_term and ids when not in use (do not pass empty strings or empty arrays). Omit pagination and sort params unless you need non-default values.

Returns: id, original rule (title, vendor, query, query_language), translated elastic rule (title, prebuilt rule id, integration ids, ES|QL query, query language), translation result, status.

Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ...query } = input;
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('view migration rules');
      }

      // No sort override — let the API default apply (translation_result desc, matching the UI).
      const response = await callSelfClient<GetRuleMigrationRulesResponse>(
        request,
        buildPath(migrationId),
        {
          method: 'GET',
          query,
        }
      );

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to get migration rules for "${migrationId}"`
        );
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: response.body.total,
              page: input.page,
              per_page: input.per_page,
              data: response.body.data.map(projectRule),
            },
          },
        ],
      };
    },
  };
};
