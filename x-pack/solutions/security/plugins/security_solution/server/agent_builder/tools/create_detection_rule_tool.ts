/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { ToolType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { RULES_UI_EDIT } from '@kbn/security-solution-features/constants';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import type { ExperimentalFeatures } from '../../../common';
import { EsqlRuleCreateProps } from '../../../common/api/detection_engine/model/rule_schema';
import {
  RULES_FEATURE_ID,
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../common/constants';
import { getBuildAgent } from '../../lib/detection_engine/ai_rule_creation/agent';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { RuleAttachmentData } from '../attachments/rule';

export const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = securityTool('create_detection_rule');

const isRuleAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<SecurityAgentBuilderAttachments.rule, RuleAttachmentData> =>
  attachment.type === SecurityAgentBuilderAttachments.rule;

/** Hyphen-free id: hyphens in a model-assembled `<render_attachment>` tag can break autolinking. */
const mintRuleAttachmentId = (): string => `air:${uuidv4().replace(/-/g, '')}`;

/**
 * A placeholder card has no real rule content (`name`/`query` absent or blank) — entry points
 * seed `"{}"`, an untouched form syncs `{"name":"","query":""}`. Both must be consumed by the
 * first create rather than leaving a phantom empty card behind.
 */
export const isPlaceholderRuleText = (text: string): boolean => {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const hasName = typeof parsed.name === 'string' && parsed.name.trim() !== '';
    const hasQuery = typeof parsed.query === 'string' && parsed.query.trim() !== '';
    return !hasName && !hasQuery;
  } catch {
    return false;
  }
};

interface ResolvedAttachmentTarget {
  resolvedAttachmentId: string;
  /** Serialized rule text to seed the graph with (query rewrites); undefined for fresh creates. */
  existingRuleText: string | undefined;
  isNewCard: boolean;
}

/**
 * Resolve which attachment the rule is written to:
 *  1. attachment_id given → update that card. Fails closed: a stale/hallucinated id, a
 *     non-rule target, or a versionless record throws instead of no-op'ing update().
 *  2. no id + empty placeholder card exists → consume it (first create from a menu/form entry).
 *  3. no id + no placeholder → mint a new id.
 */
export const resolveAttachmentTarget = (
  attachments: AttachmentStateManager,
  attachmentId: string | undefined
): ResolvedAttachmentTarget => {
  if (attachmentId) {
    const record = attachments.getAttachmentRecord(attachmentId);
    if (!record) {
      throw new Error(`Rule attachment "${attachmentId}" not found`);
    }
    if (!isRuleAttachment(record)) {
      throw new Error(
        `Attachment "${attachmentId}" is not a ${SecurityAgentBuilderAttachments.rule} attachment`
      );
    }
    const latestVersion = getLatestVersion(record);
    if (!latestVersion) {
      throw new Error(`Could not retrieve latest version of rule attachment "${attachmentId}"`);
    }
    return {
      resolvedAttachmentId: attachmentId,
      existingRuleText: latestVersion.data.text,
      isNewCard: false,
    };
  }

  const placeholderRecord = attachments.getAttachmentRecord(SECURITY_RULE_ATTACHMENT_ID);
  const placeholderVersion = placeholderRecord ? getLatestVersion(placeholderRecord) : undefined;
  const placeholderText = (placeholderVersion?.data as { text?: string } | undefined)?.text;

  if (placeholderRecord && placeholderText && isPlaceholderRuleText(placeholderText)) {
    return {
      resolvedAttachmentId: SECURITY_RULE_ATTACHMENT_ID,
      existingRuleText: undefined,
      isNewCard: false,
    };
  }

  return {
    resolvedAttachmentId: mintRuleAttachmentId(),
    existingRuleText: undefined,
    isNewCard: true,
  };
};

const createDetectionRuleSchema = z.object({
  user_query: z
    .string()
    .describe(
      'Natural language description of the detection rule to create, including threat scenarios, data sources, and desired detection logic'
    ),
  attachment_id: z
    .string()
    .optional()
    .describe(
      'ID of the existing rule attachment to update. Pass when rewriting the query of an existing rule so the tool reads the current rule state and updates in place. Omit for a fresh create.'
    ),
});

export function createDetectionRuleTool(
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): StaticToolRegistration<typeof createDetectionRuleSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createDetectionRuleSchema> = {
    id: SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
    type: ToolType.builtin,
    description: `Creates a security detection rule based on natural language description. Analyzes the query, identifies relevant data sources, generates ES|QL queries, and produces a complete detection rule with metadata, tags, and scheduling information.

The tool stores the result as an attachment (creating new or updating existing). Use the returned attachment_id and version with <render_attachment id="..." version="..."> to display it.

Limitations: only ES|QL rules are supported; requires relevant data in existing Elasticsearch indices to generate a query; severity and risk score default to low/21 and are not AI-adapted from threat context.`,
    schema: createDetectionRuleSchema,
    tags: ['security', 'detection', 'rule-creation', 'siem'],
    availability: {
      // Environment-level gates only (flag, space, ES|QL setting), so results are cacheable
      // per space. Per-user rule-edit authz is enforced in the handler — see note there.
      cacheMode: 'space',
      handler: async ({ request }) => {
        if (!experimentalFeatures?.aiRuleCreationEnabled) {
          return {
            status: 'unavailable',
            reason:
              'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
          };
        }

        const spaceAvailability = await getAgentBuilderResourceAvailability({
          core,
          request,
          logger,
        });

        if (spaceAvailability.status === 'unavailable') {
          return spaceAvailability;
        }

        const [coreStart] = await core.getStartServices();
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
        const isEsqlEnabled = await uiSettingsClient.get<boolean>(ENABLE_ESQL);

        if (!isEsqlEnabled) {
          return {
            status: 'unavailable',
            reason: 'ES|QL is disabled in this space via the enableESQL advanced setting.',
          };
        }

        return { status: 'available' };
      },
    },
    handler: async (
      { user_query: userQuery, attachment_id: attachmentId },
      { esClient, modelProvider, request, events, attachments }
    ) => {
      try {
        logger.debug(
          `Create detection rule tool invoked with query: ${userQuery.substring(0, 100)}...`
        );

        const [coreStart, startPlugins] = await core.getStartServices();

        // Mirror the UI's rule-edit gate (the DE routes only enforce authz on save). Must use
        // checkPrivileges, not UI capabilities: chat rounds run on Task Manager with a fake
        // request, where resolveCapabilities always returns false.
        const checkPrivileges =
          startPlugins.security.authz.checkPrivilegesDynamicallyWithRequest(request);
        const { hasAllRequested: canEditRules } = await checkPrivileges({
          kibana: [startPlugins.security.authz.actions.ui.get(RULES_FEATURE_ID, RULES_UI_EDIT)],
        });

        if (!canEditRules) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    'The current user does not have the privilege to create or edit detection rules.',
                },
              },
            ],
          };
        }

        const modelConfig = await modelProvider.getDefaultModel();
        const model = modelConfig.chatModel;
        const connectorId = model.getConnector().connectorId;

        if (!connectorId) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'No connector ID provided and no default connector available',
                },
              },
            ],
          };
        }

        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

        const { resolvedAttachmentId, existingRuleText, isNewCard } = resolveAttachmentTarget(
          attachments,
          attachmentId
        );

        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const iterativeAgent = await getBuildAgent({
          model,
          logger,
          inference: startPlugins.inference,
          connectorId,
          request,
          esClient: esClient.asCurrentUser,
          savedObjectsClient,
          rulesClient,
          events,
        });

        // Seed the graph with the existing rule when rewriting a query; otherwise create fresh.
        let existingRuleForGraph: Partial<EsqlRuleCreateProps> | undefined;
        if (existingRuleText) {
          try {
            const parsed = EsqlRuleCreateProps.partial().safeParse(JSON.parse(existingRuleText));
            if (parsed.success) {
              existingRuleForGraph = parsed.data;
            } else {
              logger.warn(
                `Existing rule text for attachment ${resolvedAttachmentId} failed validation`
              );
            }
          } catch {
            logger.warn(
              `Could not parse existing rule text for attachment ${resolvedAttachmentId}`
            );
          }
        }

        const result = await iterativeAgent.invoke({
          userQuery,
          ...(existingRuleForGraph && { rule: existingRuleForGraph }),
        });

        if (result.errors.length) {
          logger.error(`Rule creation failed with errors: ${result.errors.join('; ')}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to create detection rule: ${result.errors.join('; ')}`,
                  errors: result.errors,
                },
              },
            ],
          };
        }

        logger.debug(`Successfully created detection rule: ${result.rule.name}`);

        // Strip the server-assigned rule_id — it must not appear in the stored draft. `id` isn't
        // part of EsqlRuleCreateProps and can't leak in: existingRuleForGraph is schema-validated,
        // so no node in the graph ever sees or sets it.
        const { rule_id: _ruleId, ...ruleWithoutIds } = result.rule;

        const attachmentDescription = `Rule: ${result.rule.name}`;

        // Identity lives in the attachment's `origin`, which persists across update() —
        // a query rewrite of a saved rule stays "Update" without per-version carry-forward.
        const attachmentData: Record<string, unknown> = {
          text: JSON.stringify(ruleWithoutIds),
          attachmentLabel: result.rule.name,
        };

        let resultVersion: number | undefined;

        try {
          const persisted = isNewCard
            ? await attachments.add({
                id: resolvedAttachmentId,
                type: SecurityAgentBuilderAttachments.rule,
                data: attachmentData,
                description: attachmentDescription,
              })
            : await attachments.update(resolvedAttachmentId, {
                data: attachmentData,
                description: attachmentDescription,
              });

          // The LLM invoke above can take a while, so the attachment resolved earlier may have
          // been deleted by the time we get here — update() then returns undefined.
          if (!persisted) {
            throw new Error(`Failed to persist rule attachment "${resolvedAttachmentId}"`);
          }

          resultVersion = persisted.current_version;
          logger.debug(
            `${
              isNewCard ? 'Created' : 'Updated'
            } rule attachment ${resolvedAttachmentId} v${resultVersion}`
          );
        } catch (attachmentError) {
          logger.error(
            `Could not persist rule attachment: ${
              attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
            }`
          );
          throw Error('Could not persist rule attachment');
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                rule: ruleWithoutIds,
                attachment_id: resolvedAttachmentId,
                ...(resultVersion !== undefined && { version: resultVersion }),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Create detection rule tool failed: ${error.message}`, error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create detection rule: ${error.message}`,
                error: error.toString(),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
