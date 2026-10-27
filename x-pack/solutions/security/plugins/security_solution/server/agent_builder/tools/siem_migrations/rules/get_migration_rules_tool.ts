/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../common/siem_migrations/constants';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import { MigrationId } from '../common/schemas';
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

const SORT_FIELDS = [
  'elastic_rule.title',
  'elastic_rule.severity',
  'elastic_rule.risk_score',
  'elastic_rule.prebuilt_rule_id',
  'translation_result',
  'updated_at',
] as const;

const schema = lazySchema(() =>
  GetRuleMigrationRulesRequestQuery.extend({
    migration_id: MigrationId.describe(
      'REQUIRED. The id of the rule migration whose rules to retrieve.'
    ),
    page: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(
        'Zero-based page number. Defaults to 0 — omit unless paginating past the first page.'
      ),
    per_page: z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe(
        'Number of rules per page (1-200). Defaults to 50 — omit unless you need a different page size.'
      ),
    search_term: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Free-text search term matched against the translated rule title (or original title for failed rules). Omit entirely if not searching — do not pass an empty string.'
      ),
    ids: z
      .array(NonEmptyString)
      .max(200)
      .optional()
      .describe(
        'Fetch specific rules by their ids. Omit entirely if not filtering by id — do not pass an empty array. When provided, no other filter param is needed.'
      ),
    sort_field: z
      .enum(SORT_FIELDS)
      .optional()
      .describe(
        `OPTIONAL. Field to sort by. One of: ${SORT_FIELDS.join(
          ', '
        )}. Defaults to translation_result (desc) — omit unless you need a different sort order.`
      ),
    detail: z
      .enum(['summary', 'full'])
      .default('summary')
      .describe(
        'Defaults to "summary" (id, titles, installed rule id, status, translation result) — enough to list, pick or link rules. Pass "full" only when you need the queries of specific rules.'
      ),
  })
);

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_RULES_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

const projectRule = (rule: GetRuleMigrationRulesResponse['data'][number]) => ({
  id: rule.id,
  original_rule: {
    title: rule.original_rule.title,
    description: rule.original_rule.description,
    vendor: rule.original_rule.vendor,
    query: rule.original_rule.query,
    query_language: rule.original_rule.query_language,
  },
  elastic_rule: rule.elastic_rule
    ? {
        id: rule.elastic_rule.id,
        title: rule.elastic_rule.title,
        prebuilt_rule_id: rule.elastic_rule.prebuilt_rule_id,
        integration_ids: rule.elastic_rule.integration_ids,
        query: rule.elastic_rule.query,
        query_language: rule.elastic_rule.query_language,
      }
    : undefined,
  translation_result: rule.translation_result,
  status: rule.status,
  comments: rule.original_rule.vendor === 'splunk' ? [] : rule?.comments?.[0],
});

const projectRuleSummary = (rule: GetRuleMigrationRulesResponse['data'][number]) => ({
  id: rule.id,
  original_rule: { title: rule.original_rule.title },
  elastic_rule: rule.elastic_rule
    ? { id: rule.elastic_rule.id, title: rule.elastic_rule.title }
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

Only include the parameters you actually need. Boolean filter fields (is_fully_translated, is_failed, etc.) filter when set — omit them entirely when you are not filtering by that condition; is_missing_index only filters when true. search_term matches translated rule titles (original titles for failed rules). Omit search_term and ids when not in use (do not pass empty strings or empty arrays). Omit pagination and sort params unless you are paging or listing rules to choose from (then use a small per_page).

Results are paginated: \`total\` is the number of rules matching the filters, \`data\` holds at most \`per_page\` of them. When \`total\` is larger than the rules returned, the result is a partial page — fetch further pages with \`page\` or narrow the filters; never treat it as the complete set.

detail defaults to "summary", which is enough to list, count, pick or link rules. Pass detail "full" only when you need the queries and comments of specific rules (ids) — each full rule is large.

Returns (summary, default): id, original and translated titles, installed rule id (elastic_rule.id, set once installed), translation result, status.
Returns (full): id, original rule (title, description, vendor, query, query_language), translated elastic rule (installed rule id, title, prebuilt rule id, integration ids, ES|QL query, query language), translation result, status, comments ( containes Natural language detection logic for QRadar and Sentinel).

Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, detail, ...query } = input;
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
              data: response.body.data.map(detail === 'full' ? projectRule : projectRuleSummary),
            },
          },
        ],
      };
    },
  };
};
