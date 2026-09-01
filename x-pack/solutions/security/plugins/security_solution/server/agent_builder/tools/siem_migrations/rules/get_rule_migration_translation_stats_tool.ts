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
import { SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe(
    'The id of the rule migration whose translation stats to retrieve.'
  ),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH.replace(
    '{migration_id}',
    encodeURIComponent(migrationId)
  );

// The translation stats route returns 204 No Content when the migration has zero rule items
// (translation_stats.ts: last lines). Normalize that to an explicit empty shape so the
// skill/state-matrix category checks (rules.success.installable, rules.failed, etc.) always
// have a readable shape.
const emptyTranslationStats = (migrationId: string): GetRuleMigrationTranslationStatsResponse => ({
  id: migrationId,
  rules: {
    total: 0,
    success: {
      total: 0,
      result: { full: 0, partial: 0, untranslatable: 0 },
      installable: 0,
      prebuilt: 0,
      missing_index: 0,
    },
    failed: 0,
  },
});

export const getRuleMigrationTranslationStatsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Rule Migration Translation Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `Get translation stats for a single Automatic Rule Migration by id.

A migration can contain N rules — this tool summarizes the translation status of those rules.

Returns { id, rules: { total, success: { total, result: { full, partial, untranslatable }, installable, prebuilt, missing_index }, failed } }.

Field meanings:
- \`result.full\` = fully translated (ready to install)
- \`result.partial\` = partially translated (review needed)
- \`result.untranslatable\` = could not be translated
- \`installable\` = successfully translated and installable
- \`prebuilt\` = matched an Elastic prebuilt rule
- \`missing_index\` = query has a placeholder for a missing index pattern
- \`failed\` = translation errored

A migration with zero rule items returns the same shape with all counts 0 (204 No Content normalized to a stable shape).

Use this to decide whether translated rules are ready to install, and to surface partial/untranslatable/failed rules for review. Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const response = await callSelfClient<GetRuleMigrationTranslationStatsResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET' }
      );

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to get rule migration translation stats for "${migrationId}"`
        );
      }

      // 204 No Content → normalize to empty shape (zero rule items).
      const data = response.body ?? emptyTranslationStats(migrationId);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data,
          },
        ],
      };
    },
  };
};
