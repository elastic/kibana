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
      // Saves for different cards run concurrently; requestSaveRule drops a re-click on a card
      // whose save is already in flight, so same-card requests can't overlap.
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
          // Capture at request time, not after the await: closing the chat while the API call is
          // in flight emits `null` on activeConversation$, which would skip origin linking for a
          // conversation that existed when the user clicked save.
          const convId = activeConversationId;
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

          // Deactivate so a post-save form edit can't clobber the attachment before the next AI
          // round reactivates sync.
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
            // Push to cache immediately so rule details page reflects changes without waiting for refetch.
            securitySolutionQueryClient.setQueryData(
              ['GET', DETECTION_ENGINE_RULES_URL, saved.id],
              transformInput(saved)
            );
            // refetchType: 'none' prevents a background refetch that would race with the
            // setQueryData above; the cache already has the authoritative saved data.
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

          // Link the freshly-created card to its saved rule via `origin`, and do it LAST: the
          // framework `updateOrigin` callback persists the origin AND invalidates the conversation,
          // re-fetching server state, so the card durably flips to "Update" in-session. `origin`
          // is the reload-safe source of truth for the button.
          if (convId && !isUpdate && updateOrigin) {
            try {
              await updateOrigin(saved.id);
            } catch {
              // Non-fatal: the rule is saved. Warn because the card may still read "Create rule",
              // and a second click would create a duplicate.
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

          // Cleared LAST: the save button stays disabled until origin linking has settled, so a
          // rapid second click can't fire another create while the card still reads "Create rule".
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
