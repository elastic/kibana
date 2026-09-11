/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_RULE_MIGRATION_START_PATH } from '../../../../../common/siem_migrations/constants';
import {
  StartRuleMigrationRequestBody,
  type StartRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { RuleMigrationRetryFilter } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import {
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
} from './tool_ids';
import { RULE_MIGRATION_SKILLS } from '../../../skills/siem_migration/rules/skill_ids';

// Reuse the endpoint's request body schema and add the path param, so the tool input
// stays in lockstep with the API model (no schema drift). `.extend` on a lazySchema
// materializes a real ZodObject. `selection.ids` is bounded to max 200 (repo rule: prevent
// unbounded-input DoS) — a deliberate divergence from the unbounded API model.
// `langsmith_options` is omitted — it is not agent-facing. `retry` and `selection` are
// REPROCESS-only; their descriptions say so to keep the model from populating them on START.
const schema = StartRuleMigrationRequestBody.extend({
  migration_id: NonEmptyString.describe('The id of the rule migration to start or reprocess.'),
  retry: RuleMigrationRetryFilter.optional().describe(
    'REPROCESS only — omit for START/RESUME. "failed" retries only failed rules; "not_fully_translated" retries partial + untranslatable rules; "selected" retries a specific subset (pair with selection.ids).'
  ),
  selection: z
    .object({
      ids: z
        .array(NonEmptyString)
        .max(200)
        .describe(
          'REPROCESS only, paired with retry: "selected". The rule item ids to reprocess. Omit for START/RESUME.'
        ),
    })
    .optional()
    .describe(
      `REPROCESS only, paired with retry: "selected". Omit for START/RESUME. Resolve rule titles to ids via ${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}.`
    ),
}).omit({ langsmith_options: true });

export const startRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Start Rule Migration',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    confirmation: { askUser: 'once' },
    description: `Start or reprocess a SIEM rule migration. Mutating.

Resolves the inference endpoint (AI connector) via ${platformCoreTools.listInferenceEndpoints} first.

See the ${RULE_MIGRATION_SKILLS.START} skill for the START vs REPROCESS vs RESUME decision policy.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ...body } = input;

      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);

      if (!hasPrivilege) {
        return createMissingPrivilegeError('start a rule migration');
      }

      const path = SIEM_RULE_MIGRATION_START_PATH.replace(
        '{migration_id}',
        encodeURIComponent(migrationId)
      );
      const response = await callSelfClient<StartRuleMigrationResponse>(request, path, {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        return createToolErrorResult(response, `Failed to start rule migration "${migrationId}"`);
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: response.body,
          },
        ],
      };
    },
  };
};
