/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type {
  RuleResponse,
  RuleCreateProps,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { getStepsData } from '../../../../common/helpers';
import { RuleCreationEventTypes } from '../../../../../common/lib/telemetry/types';
import type { FormHook } from '../../../../../shared_imports';
import type {
  DefineStepRule,
  AboutStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from '../../../../common/types';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../../common/constants';
import { formatRule } from '../helpers';
import { getRuleIdFromAttachment } from '../../../../../agent_builder/attachment_types/rule/helpers';

const ruleDefaultMetadataFields = {
  references: [],
  severity_mapping: [],
  risk_score_mapping: [],
  related_integrations: [],
  required_fields: [],
  actions: [],
  exceptions_list: [],
  false_positives: [],
  author: [],
  setup: '',
};

const SYNC_DEBOUNCE_MS = 500;

// Adapts a `VersionedAttachment` (data lives under `versions[]`) to the `{ data }` shape the rule
// helpers read.
const versionedAttachmentView = (attachment: { versions?: unknown; origin?: string }) => ({
  data: getLatestVersion(attachment as never)?.data,
  origin: attachment.origin,
});

interface ConversationAttachment {
  id: string;
  type: string;
  origin?: string;
  versions?: unknown;
}

/** The conversation's rule card the form should track: the bound card when present, else the first rule card. */
const findRuleAttachment = (
  attachments: ConversationAttachment[],
  boundId: string | null
): ConversationAttachment | undefined =>
  (boundId
    ? attachments.find((a) => a.id === boundId && a.type === SecurityAgentBuilderAttachments.rule)
    : undefined) ?? attachments.find((a) => a.type === SecurityAgentBuilderAttachments.rule);

/**
 * Saved-rule id the form is syncing against — the single source of truth for identity.
 * Present means the sync updates that saved rule; absent means it drafts a new one.
 * Derived from the conversation's rule card (its `origin`), or the page's rule when there is
 * no card. A card without `origin` is a fresh draft and must NOT inherit the edit page's rule
 * id — a create-intent chat on an edit page stays a create.
 */
const resolveSyncRuleId = (
  attachment: ConversationAttachment | undefined,
  pageRuleId: string | undefined
): string | undefined => {
  if (!attachment) {
    return pageRuleId;
  }
  return getRuleIdFromAttachment(versionedAttachmentView(attachment) as never);
};

interface UseAgentBuilderRuleCreationParams {
  defineStepForm: FormHook<DefineStepRule, DefineStepRule>;
  aboutStepForm: FormHook<AboutStepRule, AboutStepRule>;
  scheduleStepForm: FormHook<ScheduleStepRule, ScheduleStepRule>;
  actionsStepForm: FormHook<ActionsStepRule, ActionsStepRule>;
  defineStepData?: DefineStepRule;
  aboutStepData?: AboutStepRule;
  scheduleStepData?: ScheduleStepRule;
  actionsStepData?: ActionsStepRule;
  actionTypeRegistry?: ActionTypeRegistryContract;
  /** Saved-rule id from the edit-page URL; absent on the create page. */
  pageRuleId?: string;
}

interface UseAgentBuilderRuleCreationResult {
  isAiRuleUpdateRef: React.MutableRefObject<boolean>;
}

export const useAgentBuilderRuleCreation = ({
  defineStepForm,
  aboutStepForm,
  scheduleStepForm,
  actionsStepForm,
  defineStepData,
  aboutStepData,
  scheduleStepData,
  actionsStepData,
  actionTypeRegistry,
  pageRuleId,
}: UseAgentBuilderRuleCreationParams): UseAgentBuilderRuleCreationResult => {
  const { services } = useKibana();
  const { agentBuilder, aiRuleCreation, telemetry } = services;
  const { addSuccess, addWarning } = useAppToasts();
  const isAiRuleUpdateRef = useRef(false);
  // Activation is driven by explicit user actions (Add to chat, applying a card, binding to this
  // rule's card in an open conversation) — never by merely visiting the page.
  const isSyncActive = useObservable(aiRuleCreation.formSyncActive$, false);
  // Warn once per failure streak; re-armed by the next successful sync.
  const hasWarnedSyncFailureRef = useRef(false);
  // Saved-rule id the sync targets (see resolveSyncRuleId). Present ⇔ the sync is an update.
  const syncRuleIdRef = useRef<string | undefined>(pageRuleId);

  // Reset sync state when the form closes.
  useEffect(() => {
    return () => {
      aiRuleCreation.deactivateFormSync();
      aiRuleCreation.releaseBind();
    };
  }, [aiRuleCreation]);

  // Edit pages have no telemetry-hook session cleanup (the create page does), so clear it here.
  useEffect(() => {
    if (!pageRuleId) {
      return;
    }
    return () => {
      if (aiRuleCreation.getSession()) {
        aiRuleCreation.clearSession();
      }
    };
  }, [pageRuleId, aiRuleCreation]);

  useEffect(() => {
    if (!agentBuilder?.events?.ui?.activeConversation$) {
      return;
    }
    const subscription = agentBuilder.events.ui.activeConversation$.subscribe((change) => {
      const attachments = (change?.conversation?.attachments ?? []) as ConversationAttachment[];
      const boundId = aiRuleCreation.getBoundAttachmentId();
      const ruleAttachment = findRuleAttachment(attachments, boundId);
      const cardRuleId = resolveSyncRuleId(ruleAttachment, pageRuleId);
      syncRuleIdRef.current = cardRuleId;

      // Bind alignment only applies on an edit page with a card linked to a saved rule.
      if (!ruleAttachment || !cardRuleId || !pageRuleId) {
        return;
      }
      if (cardRuleId !== pageRuleId) {
        // Different rule's attachment — don't sync this form into it.
        aiRuleCreation.deactivateFormSync();
        aiRuleCreation.releaseBind();
      } else if (boundId === null) {
        // This rule's card, not yet bound (e.g. reached the form without going through the card).
        aiRuleCreation.setBoundAttachment(ruleAttachment.id);
        aiRuleCreation.activateFormSync();
      }
    });
    return () => subscription.unsubscribe();
    // pageRuleId comes from the URL and is fixed for the page's lifetime.
  }, [agentBuilder, aiRuleCreation, pageRuleId]);

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string, savedRuleId?: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      // The saved-rule id lives in the attachment's top-level `origin` (the source of truth for the
      // "Update" button); include it on the push so syncing form edits never drops the link.
      const ruleId = savedRuleId ?? syncRuleIdRef.current;
      const targetId = aiRuleCreation.getBoundAttachmentId() ?? SECURITY_RULE_ATTACHMENT_ID;
      const attachment: AttachmentInput = {
        id: targetId,
        type: SecurityAgentBuilderAttachments.rule,
        // Guard against empty string — server treats "" as valid and would overwrite a prior label.
        ...(label ? { description: label } : {}),
        ...(ruleId ? { origin: ruleId } : {}),
        data: {
          text: JSON.stringify(ruleData),
          attachmentLabel: label,
        },
      };
      agentBuilder.addAttachment(attachment);
    },
    [agentBuilder, aiRuleCreation]
  );

  const updateFormFromChat = useCallback(
    (rule: RuleResponse, { silent = false }: { silent?: boolean } = {}) => {
      const stepsData = getStepsData({ rule: { ...ruleDefaultMetadataFields, ...rule } });

      const session = aiRuleCreation.getSession() ?? aiRuleCreation.startSession();
      aiRuleCreation.incrementApplyCount();
      // `creationSource` is deliberately not reported: the registered AiAppliedToForm schema
      // doesn't include it yet (telemetry lands in a follow-up PR), and the EBT dev-mode
      // validator throws on excess keys — which would abort the form update below.
      telemetry.reportEvent(RuleCreationEventTypes.AiAppliedToForm, {
        ruleType: rule.type,
        sessionId: session.sessionId,
        durationSinceSessionStartMs: Date.now() - session.startTimestamp,
      });

      // An update sync adopts the saved rule's own id when the applied rule carries one.
      const ruleIdForSync = syncRuleIdRef.current ? rule.id ?? syncRuleIdRef.current : undefined;
      if (ruleIdForSync) {
        syncRuleIdRef.current = ruleIdForSync;
      }

      isAiRuleUpdateRef.current = true;
      aiRuleCreation.activateFormSync();
      defineStepForm.updateFieldValues(stepsData.defineRuleData);
      aboutStepForm.updateFieldValues(stepsData.aboutRuleData);
      scheduleStepForm.updateFieldValues(stepsData.scheduleRuleData);
      actionsStepForm.updateFieldValues(stepsData.ruleActionsData);

      // Push directly to the attachment — the form sync effect may not re-run if isSyncActive is
      // already true or the ES|QL editor ignores updateFieldValues (uncontrolled input).
      addRuleAttachment(rule, rule.name || '', ruleIdForSync);

      if (!silent) {
        addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.detectionEngine.ruleCreation.agentBuilder.formUpdatedTitle',
            { defaultMessage: 'Rule form updated' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.detectionEngine.ruleCreation.agentBuilder.formUpdatedText',
            { defaultMessage: 'The form has been updated with the AI-generated rule.' }
          ),
        });
      }
    },
    [
      defineStepForm,
      aboutStepForm,
      scheduleStepForm,
      actionsStepForm,
      addSuccess,
      addRuleAttachment,
      aiRuleCreation,
      telemetry,
    ]
  );

  // Latest-callback mirror: resubscribing to the BehaviorSubject-backed stream on every render
  // would re-emit the current rule and re-apply it to the form.
  const updateFormFromChatRef = useRef(updateFormFromChat);
  updateFormFromChatRef.current = updateFormFromChat;

  useEffect(() => {
    const subscription = aiRuleCreation.aiCreatedRule$.subscribe((rule) => {
      if (rule) {
        updateFormFromChatRef.current(rule);
        aiRuleCreation.clearAiCreatedRule();
      }
    });
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // Value-stable signature so the debounce re-arms on content change, not on every render
  // (step-data objects get a fresh identity each render and would otherwise starve the timer).
  const formSignature = useMemo(
    () => JSON.stringify({ defineStepData, aboutStepData, scheduleStepData, actionsStepData }),
    [defineStepData, aboutStepData, scheduleStepData, actionsStepData]
  );

  // FORM -> CHAT: push the current form state to the rule card, debounced per edit.
  useDebounce(
    () => {
      if (
        !isSyncActive ||
        !defineStepData ||
        !aboutStepData ||
        !scheduleStepData ||
        !actionsStepData ||
        !actionTypeRegistry
      ) {
        return;
      }
      try {
        const formattedRule = formatRule<RuleCreateProps>(
          defineStepData,
          aboutStepData,
          scheduleStepData,
          actionsStepData,
          actionTypeRegistry
        );
        const ruleIdForSync = syncRuleIdRef.current;
        addRuleAttachment(
          formattedRule,
          formattedRule.name ||
            (ruleIdForSync
              ? i18n.translate(
                  'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationAttachmentLabelExisting',
                  { defaultMessage: 'Rule' }
                )
              : i18n.translate(
                  'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationAttachmentLabel',
                  { defaultMessage: 'New Rule' }
                )),
          ruleIdForSync
        );
        hasWarnedSyncFailureRef.current = false;
      } catch (e) {
        if (!hasWarnedSyncFailureRef.current) {
          hasWarnedSyncFailureRef.current = true;
          addWarning({
            title: i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationSyncFailedTitle',
              { defaultMessage: 'Rule edits are not syncing to the chat' }
            ),
            text: i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationSyncFailedText',
              {
                defaultMessage:
                  'The rule form could not be shared with the AI chat. Your rule is unaffected, but the chat may show an outdated version.',
              }
            ),
          });
        }
      }
    },
    SYNC_DEBOUNCE_MS,
    [formSignature, isSyncActive]
  );

  return { isAiRuleUpdateRef };
};
