/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type {
  RuleResponse,
  RuleCreateProps,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { getStepsData } from '../../../../common/helpers';
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
import { aiCreatedRule$, clearAiCreatedRule } from '../../../../common/ai_rule_creation_store';
import { formatRule } from '../helpers';
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
}: UseAgentBuilderRuleCreationParams): UseAgentBuilderRuleCreationResult => {
  const { services } = useKibana();
  const { agentBuilder } = services;
  const { addSuccess } = useAppToasts();
  const isAiRuleUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

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

  const updateFormFromRule = useCallback(
    (rule: RuleResponse) => {
      const stepsData = getStepsData({ rule });

      isAiRuleUpdateRef.current = true;
      defineStepForm.updateFieldValues(stepsData.defineRuleData);
      aboutStepForm.updateFieldValues(stepsData.aboutRuleData);
      scheduleStepForm.updateFieldValues(stepsData.scheduleRuleData);
      actionsStepForm.updateFieldValues(stepsData.ruleActionsData);

      addSuccess({
        title: 'Rule form updated',
        text: 'The form has been updated with the AI-generated rule.',
      });
    },
    [defineStepForm, aboutStepForm, scheduleStepForm, actionsStepForm, addSuccess]
  );

  useEffect(() => {
    const subscription = aiCreatedRule$.subscribe((rule) => {
      if (rule) {
        updateFormFromRule(rule);
        addRuleAttachment(rule, rule.name);
        clearAiCreatedRule();
      }
    });
    return () => subscription.unsubscribe();
  }, [updateFormFromRule, addRuleAttachment]);

  useEffect(() => {
    console.log(
      'useEffect',
      agentBuilder,
      defineStepData,
      aboutStepData,
      scheduleStepData,
      actionsStepData,
      actionTypeRegistry
    );
    if (
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
        console.log('formattedRule', formattedRule);
        addRuleAttachment(formattedRule, formattedRule.name ?? 'Rule');
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
