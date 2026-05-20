/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useEffect, useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
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
  /**
   * Server-assigned id of the rule being edited. When provided, the form → agent sync
   * injects this id into every attachment push so the chat always sees an existing rule
   * (showing "Save changes", not "Save rule").
   */
  existingRuleId?: string;
  /**
   * Assign `current` to a no-arg function that focuses the desired step after the form is filled
   * from agent chat (e.g. `() => goToStep(RuleStep.ruleActions)`). Uses a ref so the parent can
   * wire this after `goToStep` is defined.
   */
  onAiCreatedRuleAppliedRef?: MutableRefObject<(() => void | Promise<void>) | undefined>;
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
  onAiCreatedRuleAppliedRef,
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

  const addRuleAttachment = useCallback(
    (ruleData: unknown, label: string) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const attachment: AttachmentInput = {
        id: SECURITY_RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
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
    (rule: RuleResponse) => {
      const stepsData = getStepsData({ rule: { ...ruleDefaultMetadataFields, ...rule } });

      const session = aiRuleCreation.getSession() ?? aiRuleCreation.startSession();
      aiRuleCreation.incrementApplyCount();
      telemetry.reportEvent(RuleCreationEventTypes.AiAppliedToForm, {
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

      onAiCreatedRuleAppliedRef?.current?.();
    },
    [
      defineStepForm,
      aboutStepForm,
      scheduleStepForm,
      actionsStepForm,
      addSuccess,
      aiRuleCreation,
      telemetry,
      onAiCreatedRuleAppliedRef,
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
  ]);

  return { isAiRuleUpdateRef };
};
