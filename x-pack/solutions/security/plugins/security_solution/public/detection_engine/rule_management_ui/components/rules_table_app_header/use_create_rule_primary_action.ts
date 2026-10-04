/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { SecurityPageName } from '../../../../app/types';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleCreationEventTypes } from '../../../../common/lib/telemetry/types';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';
import * as i18n from './translations';

type PrimaryActionItem = NonNullable<AppHeaderMenu['primaryActionItem']>;

const AI_RULE_CREATION_INITIAL_MESSAGE = `Create ES|QL SIEM detection rule (name, description, data sources, detection logic, severity, risk score, schedule, tags, and MITRE ATT&CK mappings) using dedicated detection rule creation tool. Always render inline the latest version of the rule attachment.

You can review and edit everything before enabling the rule.
Desired behavior or activity to detect:

==== YOUR DESCRIPTION HERE====
`;

interface UseCreateRulePrimaryActionParams {
  isAiRuleCreationAvailable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
}

/**
 * Returns the "Create rule" primary action for the Rules page app header.
 */
export const useCreateRulePrimaryAction = ({
  isAiRuleCreationAvailable,
  isDisabled,
  isLoading,
}: UseCreateRulePrimaryActionParams): PrimaryActionItem => {
  const { agentBuilder, telemetry, aiRuleCreation } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const createRuleUrl = getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rulesCreate });

  const startAiRuleCreation = useCallback(() => {
    const session = aiRuleCreation.startSession();
    telemetry.reportEvent(RuleCreationEventTypes.CreationInitialized, {
      creationSource: 'ai',
      sessionId: session.sessionId,
    });

    const emptyRuleAttachment: AttachmentInput = {
      id: SECURITY_RULE_ATTACHMENT_ID,
      type: SecurityAgentBuilderAttachments.rule,
      data: {
        text: JSON.stringify({}),
        attachmentLabel: 'New Rule',
      },
    };

    agentBuilder?.openChat?.({
      newConversation: true,
      initialMessage: AI_RULE_CREATION_INITIAL_MESSAGE,
      autoSendInitialMessage: false,
      sessionTag: 'security',
      attachments: [emptyRuleAttachment],
    });
  }, [agentBuilder, aiRuleCreation, telemetry]);

  return useMemo<PrimaryActionItem>(() => {
    if (!isAiRuleCreationAvailable) {
      return {
        id: 'createRule',
        label: i18n.ADD_NEW_RULE,
        iconType: 'plusCircle',
        href: createRuleUrl,
        disableButton: isDisabled,
        testId: 'create-new-rule',
      };
    }

    return {
      id: 'createRule',
      label: i18n.CREATE_RULE_MENU_BUTTON,
      iconType: 'chevronSingleDown',
      disableButton: isDisabled,
      isLoading,
      testId: 'create-rule-button',
      popoverTestId: 'create-rule-context-menu-popover',
      items: [
        {
          id: 'aiRuleCreation',
          label: i18n.AI_RULE_CREATION,
          iconType: 'productAgent',
          run: startAiRuleCreation,
          testId: 'ai-rule-creation',
        },
        {
          id: 'manualRuleCreation',
          label: i18n.MANUAL_RULE_CREATION,
          href: createRuleUrl,
          testId: 'manual-rule-creation',
        },
      ],
    };
  }, [createRuleUrl, isAiRuleCreationAvailable, isDisabled, isLoading, startAiRuleCreation]);
};
