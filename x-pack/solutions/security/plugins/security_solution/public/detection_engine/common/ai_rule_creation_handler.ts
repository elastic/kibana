/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { TelemetryServiceStart } from '../../common/lib/telemetry';
import { RuleCreationEventTypes } from '../../common/lib/telemetry/types';
import type {
  RuleResponse,
  RuleUpdateProps,
} from '../../../common/api/detection_engine/model/rule_schema';
import { EsqlRuleCreateProps } from '../../../common/api/detection_engine/model/rule_schema';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
  DETECTION_ENGINE_RULES_URL,
} from '../../../common/constants';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../common/api/detection_engine/rule_management/urls';
import { createRule, updateRule } from '../rule_management/api/api';
import { transformInput, transformOutput } from './transforms';
import { securitySolutionQueryClient } from '../../common/containers/query_client/query_client_provider';
import { RULE_MANAGEMENT_FILTERS_QUERY_KEY } from '../rule_management/api/hooks/use_fetch_rule_management_filters_query';
import type { AiRuleCreationService } from './ai_rule_creation_store';

const READ_ONLY_FIELDS: Array<keyof RuleResponse> = [
  'revision',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'execution_summary',
];

const stripReadOnlyFields = (rule: RuleResponse): RuleUpdateProps => {
  const mutable = { ...rule } as Record<string, unknown>;
  for (const field of READ_ONLY_FIELDS) {
    delete mutable[field];
  }
  return mutable as unknown as RuleUpdateProps;
};

// Server rejects PUT requests that include both `id` and `rule_id`.
const stripRuleId = (rule: RuleUpdateProps): RuleUpdateProps => {
  const { rule_id: _, ...rest } = rule as RuleUpdateProps & { rule_id?: string };
  return rest as RuleUpdateProps;
};

// Strip server-assigned fields from attachment text — `id`/`rule_id` in the text causes the
// agent to skip `attachment_id` and mint a new card instead of updating the existing one.
const stripServerFields = (rule: RuleResponse): Partial<RuleResponse> => {
  const {
    id: _id,
    rule_id: _ruleId,
    revision: _revision,
    created_at: _createdAt,
    created_by: _createdBy,
    updated_at: _updatedAt,
    updated_by: _updatedBy,
    execution_summary: _execSummary,
    ...spec
  } = rule as RuleResponse & { rule_id?: string };
  return spec;
};

export const createAiRuleCreationHandler = ({
  aiRuleCreation,
  notifications,
  agentBuilder,
  telemetry,
}: {
  aiRuleCreation: AiRuleCreationService;
  notifications: NotificationsStart;
  agentBuilder?: AgentBuilderPluginStart;
  telemetry: TelemetryServiceStart;
}): Subscription => {
  let activeConversationId: string | undefined;
  let activeAttachments: Array<{ id: string; type: string }> = [];
  const conversationIdSub = agentBuilder?.events.ui.activeConversation$.subscribe((change) => {
    const nextId = change?.id;
    // Ignore transient null/undefined (sidebar briefly unbinding) — only clear on a real switch.
    if (nextId !== undefined && nextId !== activeConversationId) {
      aiRuleCreation.clearSavedCreateVersions();
    }
    activeAttachments = (change?.conversation?.attachments ?? []) as typeof activeAttachments;
    activeConversationId = nextId;
  });

  const saveSub = aiRuleCreation.saveRuleRequest$.subscribe(
    async ({ rule, attachmentId, createCardVersion }) => {
      const parseResult = EsqlRuleCreateProps.safeParse(rule);
      if (!parseResult.success) {
        const summary = parseResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        aiRuleCreation.clearSaving();
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.saveRuleHandler.saveFailedTitle', {
            defaultMessage: 'Failed to save rule',
          }),
          text: summary,
        });
        return;
      }

      try {
        let saved: RuleResponse;
        const savedRuleId = rule.id;
        const isUpdate = !!savedRuleId;
        if (savedRuleId) {
          saved = await updateRule({
            rule: transformOutput(stripRuleId(stripReadOnlyFields(rule))),
          });
        } else {
          const { id: _id, ...createProps } = rule as RuleResponse & { id?: string };
          saved = await createRule({
            rule: transformOutput(createProps as unknown as RuleUpdateProps),
          });
        }
        notifications.toasts.addSuccess(
          isUpdate
            ? i18n.translate('xpack.securitySolution.saveRuleHandler.updatedTitle', {
                defaultMessage: 'Rule updated',
              })
            : i18n.translate('xpack.securitySolution.saveRuleHandler.savedTitle', {
                defaultMessage: 'Rule saved',
              })
        );

        const session = aiRuleCreation.getSession();
        if (session) {
          telemetry.reportEvent(RuleCreationEventTypes.AiSaved, {
            ruleId: saved.id,
            isUpdate,
            sessionId: session.sessionId,
            applyCount: session.applyCount,
            durationSinceSessionStartMs: Date.now() - session.startTimestamp,
          });
        }

        aiRuleCreation.clearSaving();
        // Deactivate so a post-save form edit can't clobber the attachment's ruleId before the
        // next AI round reactivates sync.
        aiRuleCreation.deactivateFormSync();

        if (!isUpdate && createCardVersion !== undefined && attachmentId) {
          aiRuleCreation.markCreateSaved(attachmentId, createCardVersion);
        }

        const targetAttachmentId = attachmentId ?? SECURITY_RULE_ATTACHMENT_ID;

        const convId = activeConversationId;
        if (convId) {
          agentBuilder
            ?.updateAttachment(convId, targetAttachmentId, {
              data: {
                text: JSON.stringify(stripServerFields(saved)),
                attachmentLabel: saved.name,
                ruleId: saved.id,
              },
            })
            .catch(() => {
              notifications.toasts.addWarning({
                title: i18n.translate(
                  'xpack.securitySolution.saveRuleHandler.syncConversationFailedTitle',
                  {
                    defaultMessage: 'Rule saved, but the assistant view could not be synced',
                  }
                ),
                text: i18n.translate(
                  'xpack.securitySolution.saveRuleHandler.syncConversationFailedText',
                  {
                    defaultMessage:
                      'The rule was saved successfully. Refreshing the page may show the rule as not yet saved in the assistant.',
                  }
                ),
              });
            });
          if (!isUpdate) {
            agentBuilder?.updateAttachmentOrigin(convId, targetAttachmentId, saved.id).catch(() => {
              // Non-fatal: origin is a secondary link used for navigation, not the button state.
            });
          }
        }

        securitySolutionQueryClient.invalidateQueries(['POST', RULE_MANAGEMENT_RULES_URL_SEARCH], {
          exact: false,
        });
        securitySolutionQueryClient.invalidateQueries(RULE_MANAGEMENT_FILTERS_QUERY_KEY, {
          exact: false,
        });
        if (isUpdate) {
          // Push to cache immediately so rule details page reflects changes without waiting for refetch.
          securitySolutionQueryClient.setQueryData(
            ['GET', DETECTION_ENGINE_RULES_URL, saved.id],
            transformInput(saved)
          );
          securitySolutionQueryClient.invalidateQueries(['GET', DETECTION_ENGINE_RULES_URL], {
            exact: false,
          });
        }

        agentBuilder?.addAttachment({
          id: targetAttachmentId,
          type: SecurityAgentBuilderAttachments.rule,
          description: saved.name,
          data: {
            text: JSON.stringify(stripServerFields(saved)),
            attachmentLabel: saved.name,
            ruleId: saved.id,
          },
        });
      } catch (err) {
        aiRuleCreation.clearSaving();
        const message =
          (err as { body?: { message?: string } })?.body?.message ??
          (err as Error)?.message ??
          i18n.translate('xpack.securitySolution.saveRuleHandler.unknownErrorMessage', {
            defaultMessage: 'Unknown error',
          });
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.saveRuleHandler.saveFailedTitle', {
            defaultMessage: 'Failed to save rule',
          }),
          text: message,
        });
      }
    }
  );

  const clearOthersSub = aiRuleCreation.clearOtherAttachments$.subscribe((exceptId) => {
    const convId = activeConversationId;
    if (!convId || !agentBuilder) return;
    for (const att of activeAttachments) {
      if (att.id !== exceptId && att.type === SecurityAgentBuilderAttachments.rule) {
        agentBuilder
          .updateAttachment(convId, att.id, { data: { text: '{}', ruleId: null, attachmentLabel: '' } })
          .catch(() => {});
        agentBuilder.addAttachment({
          id: att.id,
          type: SecurityAgentBuilderAttachments.rule,
          data: { text: '{}', ruleId: null },
        });
      }
    }
  });

  saveSub.add(conversationIdSub);
  saveSub.add(clearOthersSub);
  return saveSub;
};
