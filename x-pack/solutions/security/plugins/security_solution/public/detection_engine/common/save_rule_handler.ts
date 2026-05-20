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
import { isRoundCompleteEvent } from '@kbn/agent-builder-common/chat/events';
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
import { transformOutput } from './transforms';
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

export const createSaveRuleHandler = ({
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
      // The server-side attachment store doesn't receive the API-assigned id after a save
      // (addAttachment only updates client-side props). Fall back to lastSavedRuleId so
      // subsequent saves after agent edits use the update path instead of creating duplicates.
      const savedRuleId = rule.id ?? aiRuleCreation.getLastSavedRuleId() ?? undefined;
      const isUpdate = !!savedRuleId;
      if (savedRuleId) {
        const ruleWithId = savedRuleId === rule.id ? rule : { ...rule, id: savedRuleId };
        saved = await updateRule({ rule: transformOutput(stripReadOnlyFields(ruleWithId)) });
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
            }),
        { toastLifeTimeMs: 2000 }
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
        securitySolutionQueryClient.invalidateQueries(['GET', DETECTION_ENGINE_RULES_URL], {
          exact: false,
        });
      }

      agentBuilder?.addAttachment({
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
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
    const lastSavedId = aiRuleCreation.getLastSavedRuleId();
    const ruleAttachment = event.data.attachments?.find(
      (a) => a.type === SecurityAgentBuilderAttachments.rule
    );
    // eslint-disable-next-line no-console
    console.log(
      '[SaveRuleHandler] roundComplete — lastSavedRuleId:',
      lastSavedId,
      '| ruleAttachment found:',
      !!ruleAttachment,
      '| attachment types:',
      event.data.attachments?.map((a) => a.type)
    );
    if (lastSavedId !== null && ruleAttachment) {
      aiRuleCreation.markDirty();
    }
  });

  // Reset lastSavedRuleId when the active conversation changes so a new conversation
  // starts fresh ("Save rule" not "Save changes"). Using pairwise so the initial
  // BehaviorSubject emission on subscribe does not trigger a spurious reset.
  const conversationSub = agentBuilder?.events.ui.activeConversation$
    .pipe(pairwise())
    .subscribe(([prev, curr]) => {
      // eslint-disable-next-line no-console
      console.log('[SaveRuleHandler] conversation changed — prev:', prev?.id, '→ curr:', curr?.id);
      // Use loose != to guard against both null and undefined — the BehaviorSubject
      // initial value may be undefined rather than null on first emission.
      if (prev != null && curr != null && prev?.id !== curr?.id) {
        aiRuleCreation.setLastSavedRuleId(null);
        aiRuleCreation.clearDirty();
      }
    });

  // Return a combined subscription so all are cleaned up on unsubscribe
  saveSub.add(dirtySub);
  saveSub.add(conversationSub);
  return saveSub;
};
