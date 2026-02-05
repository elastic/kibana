/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
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
import { RULE_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { formatRule } from '../../pages/rule_creation/helpers';

export interface AddRuleAttachmentToChatButtonProps {
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  actionsStepData: ActionsStepRule;
  actionTypeRegistry: ActionTypeRegistryContract;
  size?: 'xs' | 's' | 'm';
}

export const AddRuleAttachmentToChatButton: React.FC<AddRuleAttachmentToChatButtonProps> = ({
  defineStepData,
  aboutStepData,
  scheduleStepData,
  actionsStepData,
  actionTypeRegistry,
  size = 's',
}) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  // Format rule for AI assistant attachment
  const ruleAttachment = useMemo(() => {
    const formattedRule = formatRule<RuleCreateProps>(
      defineStepData,
      aboutStepData,
      scheduleStepData,
      actionsStepData,
      actionTypeRegistry
    );
    const ruleName = aboutStepData.name;

    return {
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(formattedRule),
        attachmentLabel: ruleName,
      },
      attachmentPrompt: RULE_ATTACHMENT_PROMPT,
    };
  }, [defineStepData, aboutStepData, scheduleStepData, actionsStepData, actionTypeRegistry]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  if (!isAgentChatExperienceEnabled) {
    return null;
  }

  return (
    <NewAgentBuilderAttachment
      onClick={openAgentBuilderFlyout}
      telemetry={{
        pathway: 'rule_creation',
        attachments: ['rule'],
      }}
      size={size}
    />
  );
};
