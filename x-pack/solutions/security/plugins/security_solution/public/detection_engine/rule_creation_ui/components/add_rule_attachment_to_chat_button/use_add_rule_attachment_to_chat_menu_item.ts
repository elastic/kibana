/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppMenuPrimaryActionItem } from '@kbn/app-menu';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import * as agentBuilderI18n from '../../../../agent_builder/components/translations';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { useReportAddToChat } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { useKibana } from '../../../../common/lib/kibana';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../common/types';
import { formatRule } from '../../pages/rule_creation/helpers';
import { NEW_RULE_ATTACHMENT_LABEL } from '../../pages/rule_creation/translations';

interface UseAddRuleAttachmentToChatMenuItemParams {
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  actionsStepData: ActionsStepRule;
  actionTypeRegistry: ActionTypeRegistryContract;
  /** Existing rule id — marks the attachment as an 'update' linked to this rule so chat shows "Update rule". */
  existingRuleId?: string;
  pathway: AgentBuilderAddToChatTelemetry['pathway'];
}

/** Builds the "Add to chat" app menu primary action that attaches the rule form state to an Agent Builder conversation. */
export const useAddRuleAttachmentToChatMenuItem = ({
  defineStepData,
  aboutStepData,
  scheduleStepData,
  actionsStepData,
  actionTypeRegistry,
  existingRuleId,
  pathway,
}: UseAddRuleAttachmentToChatMenuItemParams): AppMenuPrimaryActionItem | undefined => {
  const { aiRuleCreation } = useKibana().services;
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();

  const ruleAttachment = useMemo(() => {
    const formattedRule = formatRule<RuleCreateProps>(
      defineStepData,
      aboutStepData,
      scheduleStepData,
      actionsStepData,
      actionTypeRegistry
    );
    const attachmentLabel =
      formattedRule?.name || (!existingRuleId ? NEW_RULE_ATTACHMENT_LABEL : undefined);

    return {
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(formattedRule),
        attachmentLabel,
      },
      ...(existingRuleId ? { origin: existingRuleId } : {}),
      attachmentDescription: attachmentLabel,
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    };
  }, [
    defineStepData,
    aboutStepData,
    scheduleStepData,
    actionsStepData,
    actionTypeRegistry,
    existingRuleId,
  ]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  return useMemo<AppMenuPrimaryActionItem | undefined>(() => {
    if (!hasAgentBuilderPrivilege || !isAgentChatExperienceEnabled) {
      return undefined;
    }

    return {
      id: 'addRuleToChat',
      label: agentBuilderI18n.ADD_TO_CHAT,
      iconType: 'productAgent',
      disableButton: !hasValidAgentBuilderLicense,
      tooltipContent: !hasValidAgentBuilderLicense
        ? agentBuilderI18n.UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT
        : undefined,
      testId: 'newAgentBuilderAttachment',
      run: () => {
        reportAddToChat({ pathway, attachments: ['rule'] });
        aiRuleCreation.activateFormSync();
        aiRuleCreation.releaseBind();
        openAgentBuilderFlyout();
      },
    };
  }, [
    hasAgentBuilderPrivilege,
    isAgentChatExperienceEnabled,
    hasValidAgentBuilderLicense,
    reportAddToChat,
    pathway,
    aiRuleCreation,
    openAgentBuilderFlyout,
  ]);
};
