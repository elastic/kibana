/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { firstValueFrom } from 'rxjs';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { BulkActionEditPayload } from '../../../common/api/detection_engine/rule_management';
import type { DetectionRulesAuthz } from '../../../common/detection_engine/rule_management/authz';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../plugin_contract';
import { buildMlAuthz } from '../../lib/machine_learning/authz';
import type { MlAuthz } from '../../lib/machine_learning/authz';
import { calculateRulesAuthz } from '../../lib/detection_engine/rule_management/authz';
import { createDetectionRulesClient } from '../../lib/detection_engine/rule_management/logic/detection_rules_client/detection_rules_client';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { fetchRulesByQueryOrIds } from '../../lib/detection_engine/rule_management/api/rules/bulk_actions/fetch_rules_by_query_or_ids';
import { bulkEnableDisableRules } from '../../lib/detection_engine/rule_management/api/rules/bulk_actions/bulk_enable_disable_rules';
import { bulkEditRules } from '../../lib/detection_engine/rule_management/logic/bulk_actions/bulk_edit_rules';
import { findRules } from '../../lib/detection_engine/rule_management/logic/search/find_rules';
import type { ProductFeaturesService } from '../../lib/product_features_service';
import type { RuleAlertType } from '../../lib/detection_engine/rule_schema';

const MAX_RULES_PER_BULK_ACTION = 1000;

const bulkActionsSchema = z.object({
  action: z
    .enum(['enable', 'disable', 'delete', 'add_tags', 'delete_tags', 'set_tags'])
    .describe(
      'The bulk action to perform. "enable" enables rules, "disable" disables rules, "delete" deletes rules, "add_tags" adds tags to rules, "delete_tags" removes tags from rules, "set_tags" overwrites all tags on rules.'
    ),
  ids: z
    .array(z.string())
    .min(1)
    .max(MAX_RULES_PER_BULK_ACTION)
    .optional()
    .describe(
      'Array of rule saved object IDs (the alerting framework "id") to apply the action to. At least one of "ids" or "rule_ids" must be provided.'
    ),
  rule_ids: z
    .array(z.string())
    .min(1)
    .max(MAX_RULES_PER_BULK_ACTION)
    .optional()
    .describe(
      'Array of rule signature IDs ("rule_id") to apply the action to. At least one of "ids" or "rule_ids" must be provided.'
    ),
  tags: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Tags to add, remove, or set. Required for add_tags, delete_tags, and set_tags actions. Ignored for enable, disable, and delete actions.'
    ),
});

interface ActionDependencies {
  rulesClient: RulesClient;
  actionsClient: ActionsClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  license: ILicense;
  productFeaturesService: ProductFeaturesService;
}

export const SECURITY_BULK_ACTIONS_TOOL_ID = securityTool('bulk_actions');

export const bulkActionsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  plugins: SecuritySolutionPluginSetupDependencies,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof bulkActionsSchema> => {
  return {
    id: SECURITY_BULK_ACTIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Apply bulk actions to security detection rules. Supports enabling, disabling, deleting, and managing tags on multiple rules at once. Rules can be identified by their saved object IDs ("rule_ids") or rule signature IDs ("rule_signature_ids"). Use the alerts tool or find_prebuilt_rules tool first to discover rule IDs, then use this tool to perform actions on them.`,
    schema: bulkActionsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { request, savedObjectsClient }) => {
      const { action, ids, rule_ids: ruleIds, tags } = params;

      const totalRequested = (ids?.length ?? 0) + (ruleIds?.length ?? 0);

      try {
        logger.debug(
          `${SECURITY_BULK_ACTIONS_TOOL_ID} tool called with action="${action}" for ${totalRequested} rules`
        );

        if (totalRequested === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'At least one of "ids" or "rule_ids" must be provided.',
                },
              },
            ],
          };
        }

        if (totalRequested > MAX_RULES_PER_BULK_ACTION) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `The total number of rules across "ids" and "rule_ids" must not exceed ${MAX_RULES_PER_BULK_ACTION}.`,
                },
              },
            ],
          };
        }

        const isTagAction =
          action === 'add_tags' || action === 'delete_tags' || action === 'set_tags';

        if (isTagAction && (!tags || tags.length === 0)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `The "tags" parameter is required for the "${action}" action.`,
                },
              },
            ],
          };
        }

        const [coreStart, startPlugins] = await core.getStartServices();

        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);
        const license = await firstValueFrom(startPlugins.licensing.license$);

        const mlAuthz = buildMlAuthz({
          license,
          ml: plugins.ml,
          request,
          savedObjectsClient,
        });

        const rulesAuthz = await calculateRulesAuthz({ coreStart, request });

        const deps: ActionDependencies = {
          rulesClient,
          actionsClient,
          savedObjectsClient,
          mlAuthz,
          rulesAuthz,
          license,
          productFeaturesService,
        };

        const rules: RuleAlertType[] = [];
        const fetchErrors: string[] = [];

        // Fetch rules by saved object IDs
        if (ids && ids.length > 0) {
          const fetchOutcome = await fetchRulesByQueryOrIds({
            rulesClient,
            query: undefined,
            ids: ids,
            maxRules: MAX_RULES_PER_BULK_ACTION,
          });

          rules.push(...fetchOutcome.results.map(({ result }) => result));
          fetchErrors.push(
            ...fetchOutcome.errors.map(
              ({ item, error }) =>
                `Rule ${item}: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }

        // Fetch rules by signature IDs (rule_id)
        if (ruleIds && ruleIds.length > 0) {
          const resolvedIds = new Set(rules.map((rule) => rule.id));

          for (const signatureId of ruleIds) {
            try {
              const { data } = await findRules({
                rulesClient,
                filter: `alert.attributes.params.ruleId: "${signatureId}"`,
                page: 1,
                perPage: 1,
                fields: undefined,
                sortField: undefined,
                sortOrder: undefined,
              });

              if (data.length > 0 && !resolvedIds.has(data[0].id)) {
                rules.push(data[0]);
                resolvedIds.add(data[0].id);
              } else if (data.length === 0) {
                fetchErrors.push(`Rule with rule_id "${signatureId}": Rule not found`);
              }
            } catch (error) {
              fetchErrors.push(
                `Rule with rule_id "${signatureId}": ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
        }

        if (rules.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `No rules found for the provided IDs.`,
                  ...(fetchErrors.length > 0 && { errors: fetchErrors }),
                },
              },
            ],
          };
        }

        const result = await executeAction(action, rules, tags, deps);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  action,
                  ...(isTagAction && { tags }),
                  total: totalRequested,
                  succeeded: result.succeeded,
                  ...('skipped' in result && { skipped: result.skipped }),
                  failed: result.errors.length,
                  not_found: fetchErrors.length,
                },
                ...result.data,
                ...(result.errors.length > 0 && { errors: result.errors }),
                ...(fetchErrors.length > 0 && { fetch_errors: fetchErrors }),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_BULK_ACTIONS_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error performing bulk action "${action}": ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'rules', 'bulk-actions'],
  };
};

const handleEnableDisable = async (
  action: 'enable' | 'disable',
  rules: RuleAlertType[],
  deps: ActionDependencies
) => {
  const { updatedRules, errors } = await bulkEnableDisableRules({
    rules,
    isDryRun: false,
    rulesClient: deps.rulesClient,
    action,
    mlAuthz: deps.mlAuthz,
    rulesAuthz: deps.rulesAuthz,
  });

  return {
    succeeded: updatedRules.length,
    errors: errors.map(({ item, error }) => `Rule "${item.name}" (${item.id}): ${error.message}`),
    data: {
      ...(updatedRules.length > 0 && {
        updated_rules: updatedRules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          enabled: rule.enabled,
        })),
      }),
    },
  };
};

const handleDelete = async (rules: RuleAlertType[], deps: ActionDependencies) => {
  const detectionRulesClient = createDetectionRulesClient({
    actionsClient: deps.actionsClient,
    rulesClient: deps.rulesClient,
    savedObjectsClient: deps.savedObjectsClient,
    mlAuthz: deps.mlAuthz,
    rulesAuthz: deps.rulesAuthz,
    productFeaturesService: deps.productFeaturesService,
    license: deps.license,
  });

  const deleteResult = await detectionRulesClient.bulkDeleteRules({
    ruleIds: rules.map((rule) => rule.id),
  });

  return {
    succeeded: deleteResult.rules.length,
    errors: deleteResult.errors.map(
      (err) => `Rule "${err.rule.name}" (${err.rule.id}): ${err.message}`
    ),
    data: {
      ...(deleteResult.rules.length > 0 && {
        deleted_rules: deleteResult.rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
        })),
      }),
    },
  };
};

const handleTagEdit = async (
  action: 'add_tags' | 'delete_tags' | 'set_tags',
  rules: RuleAlertType[],
  tags: string[],
  deps: ActionDependencies
) => {
  const editActions: BulkActionEditPayload[] = [{ type: action, value: tags }];

  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(deps.savedObjectsClient);
  const detectionRulesClient = createDetectionRulesClient({
    actionsClient: deps.actionsClient,
    rulesClient: deps.rulesClient,
    savedObjectsClient: deps.savedObjectsClient,
    mlAuthz: deps.mlAuthz,
    rulesAuthz: deps.rulesAuthz,
    productFeaturesService: deps.productFeaturesService,
    license: deps.license,
  });

  const editResult = await bulkEditRules({
    actionsClient: deps.actionsClient,
    rulesClient: deps.rulesClient,
    prebuiltRuleAssetClient,
    rules,
    actions: editActions,
    mlAuthz: deps.mlAuthz,
    rulesAuthz: deps.rulesAuthz,
    ruleCustomizationStatus: detectionRulesClient.getRuleCustomizationStatus(),
  });

  return {
    succeeded: editResult.rules.length,
    skipped: editResult.skipped.length,
    errors: editResult.errors.map(
      (err) => `Rule "${err.rule.name}" (${err.rule.id}): ${err.message}`
    ),
    data: {
      ...(editResult.rules.length > 0 && {
        updated_rules: editResult.rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          tags: rule.tags,
        })),
      }),
      ...(editResult.skipped.length > 0 && {
        skipped_rules: editResult.skipped.map((skip) => ({
          id: skip.id,
          name: skip.name,
        })),
      }),
    },
  };
};

type BulkAction = 'enable' | 'disable' | 'delete' | 'add_tags' | 'delete_tags' | 'set_tags';

const executeAction = async (
  action: BulkAction,
  rules: RuleAlertType[],
  tags: string[] | undefined,
  deps: ActionDependencies
) => {
  switch (action) {
    case 'enable':
    case 'disable':
      return handleEnableDisable(action, rules, deps);
    case 'delete':
      return handleDelete(rules, deps);
    case 'add_tags':
    case 'delete_tags':
    case 'set_tags':
      return handleTagEdit(action, rules, tags as string[], deps);
  }
};
