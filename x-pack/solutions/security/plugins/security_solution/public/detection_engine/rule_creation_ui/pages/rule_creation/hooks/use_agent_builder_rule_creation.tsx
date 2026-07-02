/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import {
  getRuleIdFromAttachment,
  getRuleAttachmentIntent,
} from '../../../../../agent_builder/attachment_types/rule/helpers';

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
  /** Existing rule id — present on rule edit pages; absent on the create page. */
  existingRuleId?: string;
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
  existingRuleId,
}: UseAgentBuilderRuleCreationParams): UseAgentBuilderRuleCreationResult => {
  const { services } = useKibana();
  const { agentBuilder, aiRuleCreation, telemetry } = services;
  const { addSuccess } = useAppToasts();
  const isAiRuleUpdateRef = useRef(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Rule id for form→agent syncs: page-lifetime on edit pages, cleared on conversation switch.
  const syncRuleIdRef = useRef<string | undefined>(existingRuleId);
  const existingRuleIdRef = useRef(existingRuleId);
  existingRuleIdRef.current = existingRuleId;
  // Frozen intent — never recomputed from page state to prevent flipping.
  const intentRef = useRef<'create' | 'update'>(existingRuleId ? 'update' : 'create');

  const getRuleIdForSync = useCallback((): string | undefined => {
    // Create-intent chat on a rule edit page must not inherit the page's rule id.
    if (intentRef.current === 'create') {
      return syncRuleIdRef.current;
    }
    return syncRuleIdRef.current ?? existingRuleIdRef.current ?? undefined;
  }, []);

  // Track sync activation while the rule form is open, and reset it on close. Activation itself
  // is driven by explicit user actions — the "Add to chat" button, applying a card to the form,
  // or binding to this rule's card in an open conversation — never by merely visiting the page,
  // so users who don't touch chat get no background attachment pushes.
  useEffect(() => {
    const subscription = aiRuleCreation.formSyncActive$.subscribe(setIsSyncActive);
    return () => {
      subscription.unsubscribe();
      aiRuleCreation.deactivateFormSync();
      aiRuleCreation.releaseBind();
    };
  }, [aiRuleCreation]);

  // Edit pages have no telemetry-hook session cleanup (the create page does), so release any AI
  // session when the edit form closes — otherwise it bleeds its id/start time into the next one.
  useEffect(() => {
    if (!existingRuleId) {
      return;
    }
    return () => {
      if (aiRuleCreation.getSession()) {
        aiRuleCreation.clearSession();
      }
    };
  }, [existingRuleId, aiRuleCreation]);

  useEffect(() => {
    if (!agentBuilder?.events?.ui?.activeConversation$) {
      return;
    }
    const subscription = agentBuilder.events.ui.activeConversation$.subscribe((change) => {
      const attachments = change?.conversation?.attachments ?? [];
      const boundId = aiRuleCreation.getBoundAttachmentId();
      const ruleAttachment =
        (boundId
          ? attachments.find(
              (a) => a.id === boundId && a.type === SecurityAgentBuilderAttachments.rule
            )
          : undefined) ?? attachments.find((a) => a.type === SecurityAgentBuilderAttachments.rule);

      if (!ruleAttachment) {
        syncRuleIdRef.current = undefined;
        intentRef.current = existingRuleIdRef.current ? 'update' : 'create';
        return;
      }
      const attachmentView = versionedAttachmentView(ruleAttachment as never);
      intentRef.current = getRuleAttachmentIntent(attachmentView as never);
      const ruleId = getRuleIdFromAttachment(attachmentView as never);
      if (intentRef.current === 'create') {
        syncRuleIdRef.current = ruleId;
        return;
      }
      syncRuleIdRef.current = ruleId ?? existingRuleIdRef.current;

      // Keep the form→chat bind aligned with the rule being edited.
      const matchesThisRule = ruleId === existingRuleIdRef.current;
      if (existingRuleIdRef.current && !matchesThisRule) {
        // Different rule's attachment — don't sync this form into it.
        aiRuleCreation.deactivateFormSync();
        aiRuleCreation.releaseBind();
      } else if (existingRuleIdRef.current && matchesThisRule && boundId === null) {
        // This rule's card, not yet bound (e.g. reached the form without going through the card).
        aiRuleCreation.setBoundAttachment(ruleAttachment.id);
        aiRuleCreation.activateFormSync();
      }
    });
    return () => subscription.unsubscribe();
  }, [agentBuilder, aiRuleCreation]);

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string, savedRuleId?: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const intent = intentRef.current;
      // The saved-rule id lives in the attachment's top-level `origin` (the source of truth for the
      // "Update" button); include it on the push so syncing form edits never drops the link.
      const ruleId = intent === 'update' ? savedRuleId ?? getRuleIdForSync() : undefined;
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
    [agentBuilder, getRuleIdForSync, aiRuleCreation]
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

      const ruleIdForSync =
        intentRef.current === 'update' ? rule.id ?? getRuleIdForSync() : undefined;
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
      getRuleIdForSync,
      telemetry,
    ]
  );

  const updateFormFromChatRef = useRef(updateFormFromChat);
  updateFormFromChatRef.current = updateFormFromChat;
  const addRuleAttachmentRef = useRef(addRuleAttachment);
  addRuleAttachmentRef.current = addRuleAttachment;

  useEffect(() => {
    const subscription = aiRuleCreation.aiCreatedRule$.subscribe((rule) => {
      if (rule) {
        updateFormFromChatRef.current(rule);
        aiRuleCreation.clearAiCreatedRule();
      }
    });
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // Latest form inputs, read inside the debounce so the effect doesn't need them as deps.
  const formInputsRef = useRef({
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
  });
  formInputsRef.current = { defineStepData, aboutStepData, scheduleStepData, actionsStepData };

  // Value-stable signature so the debounce re-arms on content change, not on every render
  // (step-data objects get a fresh identity each render and would otherwise starve the timer).
  const formSignature = useMemo(
    () => JSON.stringify({ defineStepData, aboutStepData, scheduleStepData, actionsStepData }),
    [defineStepData, aboutStepData, scheduleStepData, actionsStepData]
  );

  // FORM -> CHAT
  useEffect(() => {
    const {
      defineStepData: define,
      aboutStepData: about,
      scheduleStepData: schedule,
      actionsStepData: actions,
    } = formInputsRef.current;
    if (
      !isSyncActive ||
      !agentBuilder?.addAttachment ||
      !define ||
      !about ||
      !schedule ||
      !actions ||
      !actionTypeRegistry
    ) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const formattedRule = formatRule<RuleCreateProps>(
          define,
          about,
          schedule,
          actions,
          actionTypeRegistry
        );
        const isUpdateIntent = intentRef.current === 'update';
        const ruleIdForSync = isUpdateIntent ? getRuleIdForSync() : undefined;
        addRuleAttachment(
          formattedRule,
          formattedRule.name ||
            (isUpdateIntent && ruleIdForSync
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
      } catch (e) {
        window.console.error('form→chat sync error:', e);
      }
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    isSyncActive,
    agentBuilder,
    formSignature,
    actionTypeRegistry,
    addRuleAttachment,
    getRuleIdForSync,
  ]);

  return { isAiRuleUpdateRef };
};
