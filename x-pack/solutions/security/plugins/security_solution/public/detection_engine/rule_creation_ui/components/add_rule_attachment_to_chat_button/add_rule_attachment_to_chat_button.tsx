/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { formatRule } from '../../pages/rule_creation/helpers';
import { NEW_RULE_ATTACHMENT_LABEL } from '../../pages/rule_creation/translations';
import { stripServerFields } from '../../../common/ai_rule_creation_handler';
import { useKibana } from '../../../../common/lib/kibana';

interface AddRuleAttachmentFromFormProps {
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  actionsStepData: ActionsStepRule;
  actionTypeRegistry: ActionTypeRegistryContract;
  /** Existing rule id — marks the attachment as an 'update' linked to this rule so chat shows "Update rule". */
  existingRuleId?: string;
  rule?: never;
}

interface AddRuleAttachmentFromRuleResponseProps {
  rule: RuleResponse;
  defineStepData?: never;
  aboutStepData?: never;
  scheduleStepData?: never;
  actionsStepData?: never;
  actionTypeRegistry?: never;
  existingRuleId?: never;
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
  const { services } = useKibana();
  const { aiRuleCreation } = services;
  const {
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    existingRuleId,
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
    let formattedRule: RuleCreateProps | Partial<RuleResponse> | null | undefined;
    if (isFormBased) {
      formattedRule = formatRule<RuleCreateProps>(
        defineStepData,
        aboutStepData,
        scheduleStepData,
        actionsStepData,
        actionTypeRegistry
      );
    } else {
      formattedRule = rule ? stripServerFields(rule) : rule;
    }
    const attachmentLabel =
      formattedRule?.name ||
      (isFormBased && !existingRuleId ? NEW_RULE_ATTACHMENT_LABEL : undefined);
    const linkedRuleId = rule?.id ?? existingRuleId;

    return {
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(formattedRule),
        attachmentLabel,
      },
      ...(linkedRuleId ? { origin: linkedRuleId } : {}),
      attachmentDescription: attachmentLabel,
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    };
  }, [
    isFormBased,
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    existingRuleId,
    rule,
  ]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  const handleClick = useCallback(() => {
    if (isFormBased) {
      aiRuleCreation.activateFormSync();
    }
    aiRuleCreation.releaseBind();
    openAgentBuilderFlyout();
  }, [isFormBased, aiRuleCreation, openAgentBuilderFlyout]);

  return (
    <NewAgentBuilderAttachment
      onClick={handleClick}
      telemetry={{
        pathway,
        attachments: ['rule'],
      }}
      size="s"
    />
  );
};
