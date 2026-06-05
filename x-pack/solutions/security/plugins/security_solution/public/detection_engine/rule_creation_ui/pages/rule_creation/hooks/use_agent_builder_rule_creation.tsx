/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common/chat/events';
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

  useEffect(() => {
    const subscription = aiRuleCreation.formSyncActive$.subscribe(setIsSyncActive);
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // On conversation switch, align intent/ruleId with the attachment (including on rule edit pages).
  useEffect(() => {
    if (!agentBuilder?.events?.ui?.activeConversation$) {
      return;
    }
    const subscription = agentBuilder.events.ui.activeConversation$.subscribe((change) => {
      const ruleAttachment = change?.conversation?.attachments?.find(
        (a) => a.type === SecurityAgentBuilderAttachments.rule
      );
      if (!ruleAttachment) {
        syncRuleIdRef.current = undefined;
        intentRef.current = existingRuleIdRef.current ? 'update' : 'create';
        return;
      }
      intentRef.current = getRuleAttachmentIntent(ruleAttachment as never);
      const ruleId = getRuleIdFromAttachment(ruleAttachment as never);
      if (intentRef.current === 'create') {
        syncRuleIdRef.current = ruleId;
        return;
      }
      syncRuleIdRef.current = ruleId ?? existingRuleIdRef.current;
    });
    return () => subscription.unsubscribe();
  }, [agentBuilder]);

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string, savedRuleId?: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const intent = intentRef.current;
      // ruleId is a sibling of `text` (not embedded in the rule JSON) — survives shallow merges.
      const ruleId = intent === 'update' ? savedRuleId ?? getRuleIdForSync() : undefined;
      const attachment: AttachmentInput = {
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
        // Guard against empty string — server treats "" as valid and would overwrite a prior label.
        ...(label ? { description: label } : {}),
        data: {
          text: JSON.stringify(ruleData),
          attachmentLabel: label,
          intent,
          ...(ruleId ? { ruleId } : {}),
        },
      };
      agentBuilder.addAttachment(attachment);
    },
    [agentBuilder, getRuleIdForSync]
  );

  const updateFormFromChat = useCallback(
    (rule: RuleResponse, { silent = false }: { silent?: boolean } = {}) => {
      const stepsData = getStepsData({ rule: { ...ruleDefaultMetadataFields, ...rule } });

      const session = aiRuleCreation.getSession() ?? aiRuleCreation.startSession();
      aiRuleCreation.incrementApplyCount();
      telemetry.reportEvent(RuleCreationEventTypes.AiAppliedToForm, {
        creationSource: existingRuleId ? 'ai_edit' : 'ai',
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
      existingRuleId,
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

  // CHAT -> FORM
  useEffect(() => {
    if (!agentBuilder?.events?.chat$) return;
    const subscription = agentBuilder.events.chat$.subscribe((event) => {
      if (!isRoundCompleteEvent(event)) return;
      const ruleAttachment = event.data.attachments?.find(
        (a) => a.type === SecurityAgentBuilderAttachments.rule
      );
      if (!ruleAttachment) return;
      const latestVersion = getLatestVersion(ruleAttachment);
      if (!latestVersion) return;
      let parsed: RuleResponse | undefined;
      try {
        const text = (latestVersion.data as { text?: string })?.text;
        if (!text) return;
        const result = JSON.parse(text);
        if (!result || typeof result !== 'object' || Array.isArray(result)) return;
        parsed = result as RuleResponse;
      } catch {
        // Malformed attachment text — ignore silently
        return;
      }
      intentRef.current = getRuleAttachmentIntent(ruleAttachment as never);
      const savedRuleId = getRuleIdFromAttachment(ruleAttachment as never) ?? undefined;
      const ruleToApply =
        intentRef.current === 'update' && savedRuleId ? { ...parsed, id: savedRuleId } : parsed;
      updateFormFromChatRef.current(ruleToApply, { silent: true });
    });
    return () => subscription.unsubscribe();
  }, [agentBuilder]);

  // FORM -> CHAT
  useEffect(() => {
    if (
      !isSyncActive ||
      !agentBuilder?.addAttachment ||
      !defineStepData ||
      !aboutStepData ||
      !scheduleStepData ||
      !actionsStepData ||
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
          defineStepData,
          aboutStepData,
          scheduleStepData,
          actionsStepData,
          actionTypeRegistry
        );
        const isUpdateIntent = intentRef.current === 'update';
        const ruleIdForSync = isUpdateIntent ? getRuleIdForSync() : undefined;
        const ruleToSync = ruleIdForSync ? { ...formattedRule, id: ruleIdForSync } : formattedRule;
        addRuleAttachment(
          ruleToSync,
          ruleToSync.name ||
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
      } catch {
        // Incomplete form data may cause formatting errors — ignore silently
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
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    addRuleAttachment,
    getRuleIdForSync,
  ]);

  return { isAiRuleUpdateRef };
};
