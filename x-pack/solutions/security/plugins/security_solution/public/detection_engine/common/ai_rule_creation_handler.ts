/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { mergeMap } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
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
            title: i18n.translate('xpack.securitySolution.saveRuleHandler.saveFailedTitle', {
              defaultMessage: 'Failed to save rule',
            }),
            text: summary,
          });
          return;
        }

        try {
          // Captured before the await: closing chat mid-save nulls activeConversationId.
          const convId = activeConversationId;
          const ruleProps = parseResult.data;
          let saved: RuleResponse;
          const savedRuleId = rule.id;
          const isUpdate = !!savedRuleId;
          if (savedRuleId) {
            // The server rejects PUT requests carrying both `id` and `rule_id`, so drop
            // `rule_id` and address the rule by `id` instead.
            const { rule_id: _ruleId, ...updateProps } = ruleProps;
            saved = await updateRule({
              rule: transformOutput({ ...updateProps, id: savedRuleId }),
            });
          } else {
            saved = await createRule({
              rule: transformOutput(ruleProps),
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

          // A post-save form edit must not clobber the attachment.
          aiRuleCreation.deactivateFormSync();

          const targetAttachmentId = attachmentId ?? SECURITY_RULE_ATTACHMENT_ID;

          securitySolutionQueryClient.invalidateQueries(
            ['POST', RULE_MANAGEMENT_RULES_URL_SEARCH],
            {
              exact: false,
            }
          );
          securitySolutionQueryClient.invalidateQueries(RULE_MANAGEMENT_FILTERS_QUERY_KEY, {
            exact: false,
          });
          if (isUpdate) {
            securitySolutionQueryClient.setQueryData(
              ['GET', DETECTION_ENGINE_RULES_URL, saved.id],
              transformInput(saved)
            );
            // 'none': a background refetch would race the setQueryData above.
            securitySolutionQueryClient.invalidateQueries(['GET', DETECTION_ENGINE_RULES_URL], {
              exact: false,
              refetchType: 'none',
            });
          }

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
                title: i18n.translate(
                  'xpack.securitySolution.saveRuleHandler.originLinkFailedTitle',
                  {
                    defaultMessage: 'Rule saved, but the chat card could not be linked to it',
                  }
                ),
                text: i18n.translate(
                  'xpack.securitySolution.saveRuleHandler.originLinkFailedText',
                  {
                    defaultMessage:
                      'The rule was saved successfully. Refresh the conversation before saving from this card again to avoid creating a duplicate.',
                  }
                ),
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
      })
    )
    .subscribe();

  saveSub.add(conversationIdSub);
  return saveSub;
};
