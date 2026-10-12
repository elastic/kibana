/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { RESOLUTION_RULE_IDS, type ResolutionRuleId } from '@kbn/entity-store/common';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { getResolutionToolAvailability } from './resolution_availability';

const RULE_ID_VALUES = Object.values(RESOLUTION_RULE_IDS) as [
  ResolutionRuleId,
  ...ResolutionRuleId[]
];

const schema = z.object({
  rules: z
    .array(
      z.object({
        ruleId: z
          .enum(RULE_ID_VALUES)
          .describe(
            'The stable id of the entity resolution rule. Use `security.list_resolution_rules` if needed to see the available ids and their current state.'
          ),
        enabled: z.boolean().describe('true to enable the rule, false to disable it.'),
      })
    )
    .min(1)
    .max(RULE_ID_VALUES.length)
    .describe('One or more resolution rules to enable or disable.'),
});

export const SECURITY_SET_RESOLUTION_RULES_TOOL_ID = securityTool('set_resolution_rules');

export const setResolutionRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_SET_RESOLUTION_RULES_TOOL_ID,
    type: ToolType.builtin,
    description: `Enable or disable one or more managed entity resolution rules in the current space. Requires a single user confirmation, covering every rule in the request, before any change is applied.

Use when the user asks to turn on/off, enable/disable, or re-enable automated resolution rules — including requests covering several rules at once (e.g. "enable all the resolution rules", "turn off the Windows SID and Entra GUID bridges", "disable email matching but turn on the UPN one"). Resolve each rule id first when the user named the rule rather than gave its id (use \`security.list_resolution_rules\`).

This tool only changes which resolution rules are enabled — it does not trigger a re-run of entity resolution or affect risk scoring.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'Set Resolution Rules',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
        getResolutionToolAvailability({ core, request, spaceId, experimentalFeatures, logger }),
    },
    handler: async (params, { spaceId, savedObjectsClient, prompts, callContext, request }) => {
      logger.debug(
        `${SECURITY_SET_RESOLUTION_RULES_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_SET_RESOLUTION_RULES_TOOL_ID,
        spaceId,
        actionType: 'mutation',
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'enable or disable entity resolution rules',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        // Later entries win when the same ruleId is given more than once.
        const changes = new Map<ResolutionRuleId, boolean>();
        for (const { ruleId, enabled } of params.rules) {
          changes.set(ruleId, enabled);
        }
        const requestedRules = Array.from(changes, ([ruleId, enabled]) => ({ ruleId, enabled }));

        const promptId = `resolution.set_resolution_rules.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.unprompted) {
          telemetryTracker.recordAwaitingConfirmation();
          const noun = requestedRules.length === 1 ? 'rule' : 'rules';
          const anyDisabled = requestedRules.some((rule) => !rule.enabled);
          return prompts.askForConfirmation({
            id: promptId,
            title: 'Update resolution rules',
            message: [
              `Update ${requestedRules.length} resolution ${noun} in this space?`,
              '',
              formatRuleChangesForPrompt(requestedRules),
            ].join('\n'),
            confirm_text: 'Confirm',
            cancel_text: 'Cancel',
            color: anyDisabled ? 'danger' : 'primary',
          });
        }

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'User declined to update the resolution rules.' },
              },
            ],
          };
        }

        const rulesClient = entityStore.createResolutionRulesClient(savedObjectsClient, spaceId);
        const rules = await Promise.all(
          requestedRules.map(({ ruleId, enabled }) => rulesClient.setEnabled(ruleId, enabled))
        );

        telemetryTracker.recordResultCount(rules.length);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { rules },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error updating resolution rules: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};

const formatRuleChangesForPrompt = (
  changes: readonly { ruleId: ResolutionRuleId; enabled: boolean }[]
): string => {
  const toEnable = changes.filter((change) => change.enabled).map((change) => change.ruleId);
  const toDisable = changes.filter((change) => !change.enabled).map((change) => change.ruleId);

  const lines: string[] = [];
  if (toEnable.length > 0) {
    lines.push(`**Enable:** ${toEnable.join(', ')}`);
  }
  if (toDisable.length > 0) {
    lines.push(`**Disable:** ${toDisable.join(', ')}`);
  }
  return lines.join('\n');
};
