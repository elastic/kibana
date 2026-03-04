/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { getStepsData } from '../../../../common/helpers';
import type { FormHook } from '../../../../../shared_imports';
import type {
  DefineStepRule,
  AboutStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from '../../../../common/types';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { aiCreatedRule$, clearAiCreatedRule } from '../../../../common/ai_rule_creation_store';

const RULE_ATTACHMENT_ID = 'ai-rule-creation';

interface UseAgentBuilderRuleCreationResult {
  isAiRuleUpdateRef: React.MutableRefObject<boolean>;
}

export const useAgentBuilderRuleCreation = (
  defineStepForm: FormHook<DefineStepRule, DefineStepRule>,
  aboutStepForm: FormHook<AboutStepRule, AboutStepRule>,
  scheduleStepForm: FormHook<ScheduleStepRule, ScheduleStepRule>,
  actionsStepForm: FormHook<ActionsStepRule, ActionsStepRule>
): UseAgentBuilderRuleCreationResult => {
  const { services } = useKibana();
  const { agentBuilder } = services;
  const { addSuccess } = useAppToasts();
  const isAiRuleUpdateRef = useRef(false);

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

  const syncFormToChat = useCallback(
    (rule: RuleResponse) => {
      if (!agentBuilder?.addAttachment) {
        return;
      }
      const attachment: AttachmentInput = {
        id: RULE_ATTACHMENT_ID,
        type: SecurityAgentBuilderAttachments.rule,
        data: {
          text: JSON.stringify(rule),
          attachmentLabel: rule.name,
        },
      };
      agentBuilder.addAttachment(attachment);
    },
    [agentBuilder]
  );

  useEffect(() => {
    const subscription = aiCreatedRule$.subscribe((rule) => {
      if (rule) {
        updateFormFromRule(rule);
        syncFormToChat(rule);
        clearAiCreatedRule();
      }
    });
    return () => subscription.unsubscribe();
  }, [updateFormFromRule, syncFormToChat]);

  return { isAiRuleUpdateRef };
};
