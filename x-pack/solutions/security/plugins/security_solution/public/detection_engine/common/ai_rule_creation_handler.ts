/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { mergeMap } from 'rxjs';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { EsqlRuleCreateProps } from '../../../common/api/detection_engine/model/rule_schema';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../common/constants';
import { createRule, updateRule } from '../rule_management/api/api';
import { transformOutput } from './transforms';
import type { AiRuleCreationService } from './ai_rule_creation_store';
import {
  SAVE_RULE_FAILED_TITLE,
  RULE_UPDATED_TITLE,
  RULE_SAVED_TITLE,
  ORIGIN_LINK_FAILED_TITLE,
  ORIGIN_LINK_FAILED_TEXT,
  UNKNOWN_ERROR_MESSAGE,
} from './translations';

// Strip server-assigned fields from attachment text — `id`/`rule_id` in the text causes the
// agent to skip `attachment_id` and mint a new card instead of updating the existing one.
export const stripServerFields = (rule: RuleResponse): Partial<RuleResponse> => {
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
  } = rule;
  return spec;
};

export const createAiRuleCreationHandler = ({
  aiRuleCreation,
  notifications,
  agentBuilder,
}: {
  aiRuleCreation: AiRuleCreationService;
  notifications: NotificationsStart;
  agentBuilder?: AgentBuilderPluginStart;
}): Subscription => {
  let activeConversationId: string | undefined;
  const conversationIdSub = agentBuilder?.events.ui.activeConversation$.subscribe((change) => {
    activeConversationId = change?.id;
  });

  const saveSub = aiRuleCreation.saveRuleRequest$
    .pipe(
      mergeMap(async ({ rule, attachmentId, updateOrigin }) => {
        const parseResult = EsqlRuleCreateProps.safeParse(rule);
        if (!parseResult.success) {
          const summary = parseResult.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          aiRuleCreation.clearSaving(attachmentId);
          notifications.toasts.addDanger({
            title: SAVE_RULE_FAILED_TITLE,
            text: summary,
          });
          return;
        }

        try {
          // Captured before the await: closing chat mid-save nulls activeConversationId.
          const convId = activeConversationId;
          const ruleProps = parseResult.data;
          const isUpdate = Boolean(rule.id);
          let saved: RuleResponse;
          if (isUpdate) {
            // The server rejects PUT requests carrying both `id` and `rule_id`, so drop
            // `rule_id` and address the rule by `id` instead.
            const { rule_id: _ruleId, ...updateProps } = ruleProps;
            saved = await updateRule({
              rule: transformOutput({ ...updateProps, id: rule.id }),
            });
          } else {
            saved = await createRule({
              rule: transformOutput(ruleProps),
            });
          }
          notifications.toasts.addSuccess(isUpdate ? RULE_UPDATED_TITLE : RULE_SAVED_TITLE);

          // A post-save form edit must not clobber the attachment.
          aiRuleCreation.deactivateFormSync();

          const targetAttachmentId = attachmentId ?? SECURITY_RULE_ATTACHMENT_ID;

          agentBuilder?.addAttachment({
            id: targetAttachmentId,
            type: SecurityAgentBuilderAttachments.rule,
            description: saved.name,
            ...(isUpdate ? { origin: saved.id } : {}),
            data: {
              text: JSON.stringify(stripServerFields(saved)),
              attachmentLabel: saved.name,
            },
          });

          // Link the new card to its saved rule via `origin` (the reload-safe source of truth
          // for the Update button); updateOrigin also invalidates the conversation.
          if (convId && !isUpdate && updateOrigin) {
            try {
              await updateOrigin(saved.id);
            } catch {
              // Non-fatal, but the card may still read "Create rule" — a second click would duplicate.
              notifications.toasts.addWarning({
                title: ORIGIN_LINK_FAILED_TITLE,
                text: ORIGIN_LINK_FAILED_TEXT,
              });
            }
          }

          // Cleared last so the button stays disabled until origin linking has settled.
          aiRuleCreation.clearSaving(attachmentId);
        } catch (err) {
          aiRuleCreation.clearSaving(attachmentId);
          const message =
            (err as { body?: { message?: string } })?.body?.message ??
            (err as Error)?.message ??
            UNKNOWN_ERROR_MESSAGE;
          notifications.toasts.addDanger({
            title: SAVE_RULE_FAILED_TITLE,
            text: message,
          });
        }
      })
    )
    .subscribe();

  saveSub.add(conversationIdSub);
  return saveSub;
};
