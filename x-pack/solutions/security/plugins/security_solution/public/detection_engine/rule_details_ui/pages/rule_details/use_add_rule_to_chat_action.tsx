/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { AppMenuPrimaryActionItem } from '@kbn/core-chrome-app-menu-components';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../../common/lib/kibana';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { ADD_TO_CHAT } from '../../../../agent_builder/components/translations';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';

/**
 * Builds the "Add to chat" primary action for the rule details app header menu. Reimplements the
 * behavior of `AddRuleAttachmentToChatButton` (attach the rule and open the agent builder flyout)
 * so it fits the strict app menu. Returns `undefined` when the agent chat experience is unavailable.
 */
export const useAddRuleToChatAction = (
  rule: RuleResponse | null
): AppMenuPrimaryActionItem | undefined => {
  const {
    services: { aiRuleCreation },
  } = useKibana();
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const reportAddToChatClick = useReportAddToChat();

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentId: SECURITY_RULE_ATTACHMENT_ID,
    attachmentType: SecurityAgentBuilderAttachments.rule,
    attachmentData: {
      text: JSON.stringify(rule ?? {}),
      attachmentLabel: rule?.name,
    },
    attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
  });

  const run = useCallback(() => {
    reportAddToChatClick({ pathway: 'rule_details', attachments: ['rule'] });
    aiRuleCreation.activateFormSync();
    openAgentBuilderFlyout();
  }, [aiRuleCreation, openAgentBuilderFlyout, reportAddToChatClick]);

  return useMemo<AppMenuPrimaryActionItem | undefined>(() => {
    if (rule == null || !hasAgentBuilderPrivilege || !isAgentChatExperienceEnabled) {
      return undefined;
    }

    return {
      id: 'addRuleToChat',
      label: ADD_TO_CHAT,
      iconType: 'productAgent',
      testId: 'newAgentBuilderAttachment',
      disableButton: !hasValidAgentBuilderLicense,
      run,
    };
  }, [
    rule,
    hasAgentBuilderPrivilege,
    isAgentChatExperienceEnabled,
    hasValidAgentBuilderLicense,
    run,
  ]);
};
