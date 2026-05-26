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
  /** Existing rule id — injected into every form→agent sync so chat shows "Save changes" not "Save rule". */
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
  // Rule id to inject into form→agent syncs; page-lifetime on edit pages, cleared on
  // conversation switch for create flows unless the target conversation's attachment has an id.
  const syncRuleIdRef = useRef<string | undefined>(existingRuleId);
  const existingRuleIdRef = useRef(existingRuleId);
  existingRuleIdRef.current = existingRuleId;

  const getRuleIdForSync = useCallback((): string | undefined => {
    return (
      syncRuleIdRef.current ??
      existingRuleIdRef.current ??
      aiRuleCreation.getExistingRuleId() ??
      undefined
    );
  }, [aiRuleCreation]);

  useEffect(() => {
    const subscription = aiRuleCreation.formSyncActive$.subscribe(setIsSyncActive);
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // Stable for page lifetime; not reset on conversation switches unlike lastSavedRuleId.
  useEffect(() => {
    aiRuleCreation.setExistingRuleId(existingRuleId ?? null);
    return () => aiRuleCreation.setExistingRuleId(null);
  }, [existingRuleId, aiRuleCreation]);

  useEffect(() => {
    if (existingRuleId) {
      syncRuleIdRef.current = existingRuleId;
    }
  }, [existingRuleId]);

  // Keep syncRuleIdRef aligned with chat saves; clear on conversation switch for create flows.
  useEffect(() => {
    const subscription = aiRuleCreation.lastSavedRuleId$.subscribe((id) => {
      if (id) {
        syncRuleIdRef.current = id;
      } else if (!existingRuleIdRef.current) {
        syncRuleIdRef.current = undefined;
      }
    });
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // When returning to a conversation whose rule attachment already has an id, restore sync state
  // after the global handler clears lastSavedRuleId on conversation switch.
  useEffect(() => {
    if (!agentBuilder?.events?.ui?.activeConversation$) {
      return;
    }
    const subscription = agentBuilder.events.ui.activeConversation$.subscribe((change) => {
      if (existingRuleIdRef.current) {
        return;
      }
      const ruleAttachment = change?.conversation?.attachments?.find(
        (a) => a.type === SecurityAgentBuilderAttachments.rule
      );
      if (!ruleAttachment) {
        return;
      }
      // origin is set by updateAttachmentOrigin after a chat-save and is the canonical id source.
      const idFromOrigin = (ruleAttachment as { origin?: string }).origin;
      if (idFromOrigin) {
        syncRuleIdRef.current = idFromOrigin;
        aiRuleCreation.setLastSavedRuleId(idFromOrigin);
        return;
      }
      const latestVersion = getLatestVersion(ruleAttachment);
      const text = (latestVersion?.data as { text?: string } | undefined)?.text;
      if (!text) {
        return;
      }
      try {
        const parsed = JSON.parse(text) as RuleResponse;
        if (parsed.id) {
          syncRuleIdRef.current = parsed.id;
          aiRuleCreation.setLastSavedRuleId(parsed.id);
        }
      } catch {
        // Malformed attachment text — ignore silently
      }
    });
    return () => subscription.unsubscribe();
  }, [agentBuilder, aiRuleCreation]);

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const attachment: AttachmentInput = {
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
        // description populates the chat's "Attachment added: …" label.
        // Guard against empty string — server update path treats "" as valid and would overwrite a prior label.
        ...(label ? { description: label } : {}),
        data: {
          text: JSON.stringify(ruleData),
          attachmentLabel: label,
        },
      };
      agentBuilder.addAttachment(attachment);
    },
    [agentBuilder]
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

      // Keep syncRuleIdRef in sync so subsequent form→agent pushes preserve the id.
      const ruleIdForSync = rule.id ?? getRuleIdForSync();
      if (ruleIdForSync) {
        syncRuleIdRef.current = ruleIdForSync;
      }

      isAiRuleUpdateRef.current = true;
      aiRuleCreation.activateFormSync();
      defineStepForm.updateFieldValues(stepsData.defineRuleData);
      aboutStepForm.updateFieldValues(stepsData.aboutRuleData);
      scheduleStepForm.updateFieldValues(stepsData.scheduleRuleData);
      actionsStepForm.updateFieldValues(stepsData.ruleActionsData);

      // Push the AI rule directly to the attachment so it propagates even when the form sync
      // effect doesn't re-run (e.g. isSyncActive is already true, or defineStepData reference
      // doesn't change because the ES|QL editor is uncontrolled and ignores updateFieldValues).
      const ruleToSync = ruleIdForSync ? { ...rule, id: ruleIdForSync } : rule;
      addRuleAttachment(ruleToSync, ruleToSync.name || '');
      aiRuleCreation.markDirty();

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

  // Auto-sync: when the agent updates the rule attachment in chat (via attachment_update or
  // create_detection_rule), automatically apply those changes to the rule form so the user
  // doesn't need to click "Open in form" manually after each AI edit.
  useEffect(() => {
    if (!agentBuilder?.events?.chat$) return;
    const subscription = agentBuilder.events.chat$.subscribe((event) => {
      if (!isRoundCompleteEvent(event)) return;
      const ruleAttachment = event.data.attachments?.find(
        (a) => a.type === SecurityAgentBuilderAttachments.rule
      );
      if (!ruleAttachment) return;
      // roundComplete has VersionedAttachment — data is in versions[].data, not top-level.
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
      // Don't add attachment here — agent owns it; form→agent sync handles subsequent edits.
      updateFormFromChatRef.current(parsed, { silent: true });
    });
    return () => subscription.unsubscribe();
  }, [agentBuilder, aiRuleCreation]);

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
        // Inject rule id so the attachment keeps track of which rule after form edits.
        const ruleIdForSync = getRuleIdForSync();
        const ruleToSync = ruleIdForSync ? { ...formattedRule, id: ruleIdForSync } : formattedRule;
        addRuleAttachment(
          ruleToSync,
          ruleToSync.name ||
            (ruleIdForSync
              ? i18n.translate(
                  'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationAttachmentLabelExisting',
                  { defaultMessage: 'Rule' }
                )
              : i18n.translate(
                  'xpack.securitySolution.detectionEngine.createRule.aiRuleCreationAttachmentLabel',
                  { defaultMessage: 'New Rule' }
                ))
        );
        // Mark dirty on any form change so user edits are also savable from chat.
        aiRuleCreation.markDirty();
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
    aiRuleCreation,
    getRuleIdForSync,
  ]);

  return { isAiRuleUpdateRef };
};
