/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppMenuItemType } from '@kbn/app-menu';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import {
  SECURITY_RULE_ATTACHMENT_ID,
  SecurityAgentBuilderAttachments,
} from '../../../../../common/constants';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import * as agentBuilderI18n from '../../../../agent_builder/components/translations';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { useKibana } from '../../../../common/lib/kibana';
import { stripServerFields } from '../../../common/ai_rule_creation_handler';

/** Builds the "Add to chat" app menu item that attaches the rule to an Agent Builder conversation. */
export const useAddRuleToChatMenuItem = (
  rule: RuleResponse | null
): AppMenuItemType | undefined => {
  const { aiRuleCreation } = useKibana().services;
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();

  const ruleAttachment = useMemo(
    () => ({
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(rule ? stripServerFields(rule) : rule),
        attachmentLabel: rule?.name,
      },
      ...(rule ? { origin: rule.id } : {}),
      attachmentDescription: rule?.name,
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    }),
    [rule]
  );

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(ruleAttachment);

  return useMemo<AppMenuItemType | undefined>(() => {
    if (!rule || !hasAgentBuilderPrivilege || !isAgentChatExperienceEnabled) {
      return undefined;
    }

    return {
      id: 'addRuleToChat',
      label: agentBuilderI18n.ADD_TO_CHAT,
      iconType: 'productAgent',
      overflow: true,
      disableButton: !hasValidAgentBuilderLicense,
      tooltipContent: !hasValidAgentBuilderLicense
        ? agentBuilderI18n.UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT
        : undefined,
      testId: 'newAgentBuilderAttachment',
      run: () => {
        reportAddToChat({ pathway: 'rule_details', attachments: ['rule'] });
        aiRuleCreation.releaseBind();
        openAgentBuilderFlyout();
      },
    };
  }, [
    rule,
    hasAgentBuilderPrivilege,
    isAgentChatExperienceEnabled,
    hasValidAgentBuilderLicense,
    reportAddToChat,
    aiRuleCreation,
    openAgentBuilderFlyout,
  ]);
};
