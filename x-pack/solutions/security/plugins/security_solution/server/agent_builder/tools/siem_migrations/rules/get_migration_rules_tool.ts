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
import { createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID } from './tool_ids';

// Extend the OpenAPI-generated query schema, bounding the unbounded inputs (repo rule: prevent
// unbounded-input DoS). `page` is ZERO-BASED — the route computes `from: page * size`
// (api/rules/get.ts), so `page=0` is the first page. `ids` is redefined as a plain array
// (the route validates arrays; the API model's `ArrayFromString` string-split preprocess is
// dropped — a deliberate divergence called out in the plan). Booleans and sort fields come
// from the gen type unchanged.
const schema = GetRuleMigrationRulesRequestQuery.extend({
  migration_id: NonEmptyString.describe('The id of the rule migration whose rules to retrieve.'),
  page: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('Zero-based page number (0 = first page).'),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe('Number of rules per page (1-200).'),
  search_term: z.string().max(500).optional(),
  ids: z.array(NonEmptyString).max(200).optional(),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_RULES_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

// Project each RuleMigrationRule down to the fields the agent actually needs. The full rule
// carries the original query + translated ES|QL + LLM comments — dumping those into the model
// context is wasteful and noisy. Keep id + titles + prebuilt id + translation result + status.
const projectRule = (rule: GetRuleMigrationRulesResponse['data'][number]) => ({
  id: rule.id,
  original_rule: {
    title: rule.original_rule.title,
    vendor: rule.original_rule.vendor,
  },
  elastic_rule: rule.elastic_rule
    ? {
        title: rule.elastic_rule.title,
        prebuilt_rule_id: rule.elastic_rule.prebuilt_rule_id,
        integration_ids: rule.elastic_rule.integration_ids,
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

Supports filtering by translation result, installed/prebuilt, search term, or explicit ids.
Pagination is zero-based.

Returns projected fields only (id, original title, vendor, translated title, prebuilt rule id, integration ids, translation result, status) — not full rule bodies.

Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ...query } = input;
      // Default sort: translated title asc (deterministic pagination of translated rules).
      const response = await callSelfClient<GetRuleMigrationRulesResponse>(
        request,
        buildPath(migrationId),
        {
          method: 'GET',
          query: {
            ...query,
            sort_field: query.sort_field ?? 'elastic_rule.title',
            sort_direction: query.sort_direction ?? 'asc',
          },
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
