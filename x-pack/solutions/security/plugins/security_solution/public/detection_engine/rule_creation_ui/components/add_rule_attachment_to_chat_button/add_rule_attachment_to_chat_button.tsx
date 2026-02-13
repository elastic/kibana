/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../common/types';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import {
  RULE_ATTACHMENT_PROMPT,
  RULE_EXPLORATION_ATTACHMENT_PROMPT,
} from '../../../../agent_builder/components/prompts';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { formatRule } from '../../pages/rule_creation/helpers';
import { getStepsData } from '../../../common/helpers';
import { useKibana } from '../../../../common/lib/kibana';

interface AddRuleAttachmentFromFormProps {
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  actionsStepData: ActionsStepRule;
  actionTypeRegistry: ActionTypeRegistryContract;
  rule?: never;
}

interface AddRuleAttachmentFromRuleResponseProps {
  rule: RuleResponse;
  defineStepData?: never;
  aboutStepData?: never;
  scheduleStepData?: never;
  actionsStepData?: never;
  actionTypeRegistry?: never;
}

export type AddRuleAttachmentToChatButtonProps = (
  | AddRuleAttachmentFromFormProps
  | AddRuleAttachmentFromRuleResponseProps
) & {
  size?: 'xs' | 's' | 'm';
  pathway?: AgentBuilderAddToChatTelemetry['pathway'];
  mode?: 'creation' | 'exploration';
};

const isFormProps = (
  props: AddRuleAttachmentToChatButtonProps
): props is AddRuleAttachmentFromFormProps & {
  size?: 'xs' | 's' | 'm';
  pathway?: AgentBuilderAddToChatTelemetry['pathway'];
} => {
  return 'defineStepData' in props;
};

export const AddRuleAttachmentToChatButton: React.FC<AddRuleAttachmentToChatButtonProps> = (props) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const { triggersActionsUi } = useKibana().services;
  const size = props.size ?? 's';
  const pathway = props.pathway ?? 'rule_creation';
  const mode = props.mode ?? 'creation';

  // Format rule for AI assistant attachment from either form state or an existing rule response.
  const ruleAttachment = useMemo(() => {
    if (isFormProps(props)) {
      const formattedRule = formatRule<RuleCreateProps>(
        props.defineStepData,
        props.aboutStepData,
        props.scheduleStepData,
        props.actionsStepData,
        props.actionTypeRegistry
      );
      const ruleName = props.aboutStepData.name;

      return {
        attachmentType: SecurityAgentBuilderAttachments.rule,
        attachmentData: {
          text: JSON.stringify(formattedRule),
          attachmentLabel: ruleName,
        },
        attachmentPrompt:
          mode === 'exploration' ? RULE_EXPLORATION_ATTACHMENT_PROMPT : RULE_ATTACHMENT_PROMPT,
      };
    }

    const { aboutRuleData, defineRuleData, scheduleRuleData, ruleActionsData } = getStepsData({
      rule: props.rule,
      detailsView: true,
    });
    const formattedRule = formatRule<RuleCreateProps>(
      defineRuleData,
      aboutRuleData,
      scheduleRuleData,
      ruleActionsData,
      triggersActionsUi.actionTypeRegistry
    );

    return {
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(formattedRule),
        attachmentLabel: props.rule.name,
      },
      attachmentPrompt:
        mode === 'exploration' ? RULE_EXPLORATION_ATTACHMENT_PROMPT : RULE_ATTACHMENT_PROMPT,
    };
  }, [mode, props, triggersActionsUi.actionTypeRegistry]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  if (!isAgentChatExperienceEnabled) {
    return null;
  }

  return (
    <NewAgentBuilderAttachment
      onClick={openAgentBuilderFlyout}
      telemetry={{
        pathway,
        attachments: ['rule'],
      }}
      size={size}
    />
  );
};
