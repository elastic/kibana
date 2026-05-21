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
import { ChatEventType, isRoundCompleteEvent } from '@kbn/agent-builder-common/chat/events';
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

// Event types that signal the agent is actively processing a round. Used to drive the
// "agentBusy" flag so attachment action buttons can be suppressed during reasoning/streaming.
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
  /**
   * Server-assigned id of the rule being edited. When provided, the form → agent sync
   * injects this id into every attachment push so the chat always sees an existing rule
   * (showing "Save changes", not "Save rule").
   */
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
  // Tracks the rule id to preserve in form→agent syncs. Seeded from existingRuleId
  // (edit page) and updated if the agent provides a rule with an id via Open in form.
  const syncRuleIdRef = useRef<string | undefined>(existingRuleId);

  useEffect(() => {
    const subscription = aiRuleCreation.formSyncActive$.subscribe(setIsSyncActive);
    return () => subscription.unsubscribe();
  }, [aiRuleCreation]);

  // Tell save_rule_handler which rule this page is editing. Unlike lastSavedRuleId, this
  // is not reset on conversation switches — it's stable for the lifetime of the page.
  useEffect(() => {
    aiRuleCreation.setExistingRuleId(existingRuleId ?? null);
    return () => aiRuleCreation.setExistingRuleId(null);
  }, [existingRuleId, aiRuleCreation]);

  // Track whether the agent is mid-round so attachment cards can hide their action buttons
  // during reasoning/streaming. Any agent-activity event marks busy; roundComplete clears it.
  useEffect(() => {
    if (!agentBuilder?.events?.chat$) return;
    const subscription = agentBuilder.events.chat$.subscribe((event) => {
      if (isRoundCompleteEvent(event)) {
        aiRuleCreation.setAgentBusy(false);
      } else if (AGENT_ACTIVITY_EVENT_TYPES.has(event.type)) {
        aiRuleCreation.setAgentBusy(true);
      }
    });
    return () => {
      subscription.unsubscribe();
      aiRuleCreation.setAgentBusy(false);
    };
  }, [agentBuilder, aiRuleCreation]);

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const attachment: AttachmentInput = {
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
        // `description` is the user-facing label used by the chat's "Attachment added: …"
        // line (see RoundAttachmentReferences). Without it the line shows up blank.
        description: label,
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
      if (rule.id) {
        syncRuleIdRef.current = rule.id;
      }

      isAiRuleUpdateRef.current = true;
      aiRuleCreation.activateFormSync();
      defineStepForm.updateFieldValues(stepsData.defineRuleData);
      aboutStepForm.updateFieldValues(stepsData.aboutRuleData);
      scheduleStepForm.updateFieldValues(stepsData.scheduleRuleData);
      actionsStepForm.updateFieldValues(stepsData.ruleActionsData);

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
      aiRuleCreation,
      existingRuleId,
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
        addRuleAttachmentRef.current(rule, rule.name);
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
      // roundComplete attachments are VersionedAttachment — data lives inside versions[].data,
      // not at the top level. Use getLatestVersion to reach the current version's data.
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
      // Do NOT call addRuleAttachment here — the agent already owns the attachment;
      // the debounced form→agent sync (below) will push any subsequent user edits back.
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
        // Preserve the rule id (existing rule being edited) so the chat attachment
        // never loses track of which rule this is after form edits.
        const ruleToSync = syncRuleIdRef.current
          ? { ...formattedRule, id: syncRuleIdRef.current }
          : formattedRule;
        addRuleAttachment(ruleToSync, ruleToSync.name ?? 'Rule');
        // Any reach of this branch means the form changed (the effect's deps are the form
        // data objects). Mark dirty so the chat's "Save changes" button becomes enabled —
        // user-initiated form edits should be just as savable from chat as agent edits.
        // This is redundant when the change originated from updateFormFromChat (which
        // already fires markDirty via save_rule_handler's roundComplete subscriber), but
        // that's fine — markDirty is idempotent.
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
  ]);

  return { isAiRuleUpdateRef };
};
