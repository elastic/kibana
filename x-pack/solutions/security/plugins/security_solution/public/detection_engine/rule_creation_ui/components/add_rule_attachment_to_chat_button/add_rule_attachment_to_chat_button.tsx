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
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { formatRule } from '../../pages/rule_creation/helpers';

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
  pathway: AgentBuilderAddToChatTelemetry['pathway'];
};

export const AddRuleAttachmentToChatButton: React.FC<AddRuleAttachmentToChatButtonProps> = ({
  pathway,
  ...props
}) => {
  const {
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    rule,
  } = props;

  // Format rule for AI assistant attachment from either form state or an existing rule response.
  const isFormBased =
    defineStepData != null &&
    aboutStepData != null &&
    scheduleStepData != null &&
    actionsStepData != null &&
    actionTypeRegistry != null;

  const ruleAttachment = useMemo(() => {
    const formattedRule = isFormBased
      ? formatRule<RuleCreateProps>(
          defineStepData,
          aboutStepData,
          scheduleStepData,
          actionsStepData,
          actionTypeRegistry
        )
      : rule;
    const attachmentLabel = formattedRule?.name;
    const attachmentData = JSON.stringify(formattedRule);

    return {
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: attachmentData,
        attachmentLabel,
      },
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    };
  }, [
    isFormBased,
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    rule,
  ]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  return (
    <NewAgentBuilderAttachment
      onClick={openAgentBuilderFlyout}
      telemetry={{
        pathway,
        attachments: ['rule'],
      }}
      size="s"
    />
  );
};
