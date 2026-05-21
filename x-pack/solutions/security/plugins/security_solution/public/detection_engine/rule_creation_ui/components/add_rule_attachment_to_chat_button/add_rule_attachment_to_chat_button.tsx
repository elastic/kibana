/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { formatRule } from '../../pages/rule_creation/helpers';
import { useKibana } from '../../../../common/lib/kibana';

interface AddRuleAttachmentFromFormProps {
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  actionsStepData: ActionsStepRule;
  actionTypeRegistry: ActionTypeRegistryContract;
  /** When editing an existing rule, pass its server-assigned id so the attachment
   * carries `id` and the chat shows "Save changes" instead of "Save rule". */
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
  const {
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    existingRuleId,
    rule,
  } = props;

  const { services } = useKibana();
  const { agentBuilder, aiRuleCreation } = services;

  // When this button is used on the rule details page (rule prop with an id), seed
  // lastSavedRuleId so save_rule_handler's dirty-tracking subscription can fire.
  // Re-seed on every conversation change because save_rule_handler resets it on switch.
  const ruleId = rule?.id;
  useEffect(() => {
    if (!ruleId) return;
    aiRuleCreation.setLastSavedRuleId(ruleId);
    const conversationSub = agentBuilder?.events?.ui?.activeConversation$.subscribe(() => {
      aiRuleCreation.setLastSavedRuleId(ruleId);
    });
    return () => conversationSub?.unsubscribe();
  }, [ruleId, aiRuleCreation, agentBuilder]);

  // Format rule for AI assistant attachment from either form state or an existing rule response.
  const isFormBased =
    defineStepData != null &&
    aboutStepData != null &&
    scheduleStepData != null &&
    actionsStepData != null &&
    actionTypeRegistry != null;

  const ruleAttachment = useMemo(() => {
    let formattedRule: RuleCreateProps | RuleResponse | null | undefined;
    if (isFormBased) {
      const fromForm = formatRule<RuleCreateProps>(
        defineStepData,
        aboutStepData,
        scheduleStepData,
        actionsStepData,
        actionTypeRegistry
      );
      // Preserve the server-assigned id when editing an existing rule so the chat
      // attachment knows this is an update, not a new rule.
      formattedRule = existingRuleId ? { ...fromForm, id: existingRuleId } : fromForm;
    } else {
      formattedRule = rule;
    }
    const attachmentLabel = formattedRule?.name;
    const attachmentData = JSON.stringify(formattedRule);

    return {
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: attachmentData,
        attachmentLabel,
      },
      // Top-level VersionedAttachment.description used by the chat's
      // "Attachment added: …" label (RoundAttachmentReferences). Without it
      // the line shows up blank in the user's input round.
      attachmentDescription: attachmentLabel,
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
    openAgentBuilderFlyout();
  }, [openAgentBuilderFlyout]);

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
