/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { pairwise } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { ChatEventType, isRoundCompleteEvent } from '@kbn/agent-builder-common/chat/events';
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

const AGENT_ACTIVITY_EVENT_TYPES = new Set<string>([
  ChatEventType.reasoning,
  ChatEventType.messageChunk,
  ChatEventType.messageComplete,
  ChatEventType.toolCall,
  ChatEventType.browserToolCall,
  ChatEventType.toolProgress,
  ChatEventType.toolResult,
  ChatEventType.toolUi,
  ChatEventType.thinkingComplete,
  ChatEventType.promptRequest,
]);

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

// When updating by id, rule_id must not be present — the server rejects requests
// with both fields set. Strip it so the PUT body only carries the id identifier.
const stripRuleId = (rule: RuleUpdateProps): RuleUpdateProps => {
  const { rule_id: _, ...rest } = rule as RuleUpdateProps & { rule_id?: string };
  return rest as RuleUpdateProps;
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
  const saveSub = aiRuleCreation.saveRuleRequest$.subscribe(async (rule) => {
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
      // Resolve the rule id to determine create vs update:
      // 1. rule.id — present when the attachment JSON already carries a server id
      // 2. lastSavedRuleId — set after a successful save in this session
      // 3. existingRuleId — set on mount by the page that knows the rule (details/editing)
      const savedRuleId =
        rule.id ??
        aiRuleCreation.getLastSavedRuleId() ??
        aiRuleCreation.getExistingRuleId() ??
        undefined;
      const isUpdate = !!savedRuleId;
      if (savedRuleId) {
        const ruleWithId = savedRuleId === rule.id ? rule : { ...rule, id: savedRuleId };
        saved = await updateRule({
          rule: transformOutput(stripRuleId(stripReadOnlyFields(ruleWithId))),
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

      aiRuleCreation.setLastSavedRuleId(saved.id);
      aiRuleCreation.clearDirty();
      aiRuleCreation.clearSaving();

      securitySolutionQueryClient.invalidateQueries(['POST', RULE_MANAGEMENT_RULES_URL_SEARCH], {
        exact: false,
      });
      securitySolutionQueryClient.invalidateQueries(RULE_MANAGEMENT_FILTERS_QUERY_KEY, {
        exact: false,
      });
      if (isUpdate) {
        // Immediately push the saved rule into the detail-page cache so the rule details
        // page reflects changes without waiting for a background refetch.
        securitySolutionQueryClient.setQueryData(
          ['GET', DETECTION_ENGINE_RULES_URL, saved.id],
          transformInput(saved)
        );
        securitySolutionQueryClient.invalidateQueries(['GET', DETECTION_ENGINE_RULES_URL], {
          exact: false,
        });
      }

      agentBuilder?.addAttachment({
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
        // `description` is the user-facing label used by the chat's "Attachment added: …"
        // line (see RoundAttachmentReferences). Without it the line shows up blank.
        description: saved.name,
        data: { text: JSON.stringify(saved), attachmentLabel: saved.name },
      });
    } catch (err) {
      aiRuleCreation.clearSaving();
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        (err as Error)?.message ??
        'Unknown error';
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.securitySolution.saveRuleHandler.saveFailedTitle', {
          defaultMessage: 'Failed to save rule',
        }),
        text: message,
      });
    }
  });

  // Mark dirty when any tool modifies the rule attachment after a save. roundComplete carries
  // only the attachments that changed during the round, covering both attachment_update and
  // create_detection_rule (which also replaces the attachment's content).
  const dirtySub = agentBuilder?.events.chat$.subscribe((event) => {
    if (!isRoundCompleteEvent(event)) return;
    const ruleAttachment = event.data.attachments?.find(
      (a) => a.type === SecurityAgentBuilderAttachments.rule
    );
    const hasKnownRule =
      aiRuleCreation.getLastSavedRuleId() !== null || aiRuleCreation.getExistingRuleId() !== null;
    if (hasKnownRule && ruleAttachment) {
      aiRuleCreation.markDirty();
    }
  });

  // Reset lastSavedRuleId when the active conversation changes so a new conversation
  // starts fresh ("Save rule" not "Save changes"). Using pairwise so the initial
  // BehaviorSubject emission on subscribe does not trigger a spurious reset.
  const conversationSub = agentBuilder?.events.ui.activeConversation$
    .pipe(pairwise())
    .subscribe(([prev, curr]) => {
      // Use loose != to guard against both null and undefined — the BehaviorSubject
      // initial value may be undefined rather than null on first emission.
      if (prev != null && curr != null && prev?.id !== curr?.id) {
        aiRuleCreation.setLastSavedRuleId(null);
        aiRuleCreation.clearDirty();
      }
    });

  // Track whether the agent is mid-round so attachment cards can hide their action buttons
  // during reasoning/streaming. Runs globally (not per-page) so standalone chat-first
  // surfaces get the same button gating as the rule create/edit form pages.
  const agentBusySub = agentBuilder?.events.chat$.subscribe((event) => {
    if (isRoundCompleteEvent(event)) {
      aiRuleCreation.setAgentBusy(false);
    } else if (AGENT_ACTIVITY_EVENT_TYPES.has(event.type)) {
      aiRuleCreation.setAgentBusy(true);
    }
  });

  // Return a combined subscription so all are cleaned up on unsubscribe
  saveSub.add(dirtySub);
  saveSub.add(conversationSub);
  saveSub.add(agentBusySub);
  return saveSub;
};
