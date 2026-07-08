/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuPrimaryActionItem } from '@kbn/core-chrome-app-menu-components';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  APP_UI_ID,
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { RuleCreationEventTypes } from '../../../../common/lib/telemetry/types';
import { ADD_NEW_RULE } from '../../../common/translations';

const AI_RULE_CREATION_INITIAL_MESSAGE = `Create ES|QL SIEM detection rule (name, description, data sources, detection logic, severity, risk score, schedule, tags, and MITRE ATT&CK mappings) using dedicated detection rule creation tool. Always render inline the latest version of the rule attachment.

You can review and edit everything before enabling the rule.
Desired behavior or activity to detect:

==== YOUR DESCRIPTION HERE====
`;

const CREATE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.buttonLabel',
  { defaultMessage: 'Create rule' }
);

const AI_RULE_CREATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation',
  { defaultMessage: 'AI rule creation' }
);

const MANUAL_RULE_CREATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.manual',
  { defaultMessage: 'Manual rule creation' }
);

interface UseCreateRulePrimaryActionParams {
  loading: boolean;
  isDisabled: boolean;
  isAiRuleCreationAvailable: boolean;
}

/**
 * Builds the "Create rule" primary action for the rules management app menu.
 *
 * When AI rule creation is available it renders a popover offering both AI and manual creation,
 * otherwise it renders a single "Create new rule" action that navigates to the manual creation page.
 */
export const useCreateRulePrimaryAction = ({
  loading,
  isDisabled,
  isAiRuleCreationAvailable,
}: UseCreateRulePrimaryActionParams): AppMenuPrimaryActionItem => {
  const { services } = useKibana();
  const { agentBuilder, telemetry, aiRuleCreation, application } = services;
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { href: manualCreateHref } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rulesCreate,
  });

  const navigateToManualCreate = useCallback(() => {
    application.navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rulesCreate });
  }, [application]);

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

  if (isAiRuleCreationAvailable) {
    return {
      id: 'createRule',
      label: CREATE_RULE,
      iconType: 'arrowDown',
      testId: 'create-rule-button',
      popoverTestId: 'create-rule-context-menu-popover',
      isLoading: loading,
      disableButton: isDisabled,
      items: [
        {
          id: 'aiRuleCreation',
          label: AI_RULE_CREATION,
          iconType: 'productAgent',
          order: 0,
          run: startAiRuleCreation,
          testId: 'ai-rule-creation',
          separator: 'below',
        },
        {
          id: 'manualRuleCreation',
          label: MANUAL_RULE_CREATION,
          iconType: 'plusInCircle',
          order: 1,
          href: manualCreateHref,
          run: navigateToManualCreate,
          testId: 'manual-rule-creation',
        },
      ],
    };
  }

  return {
    id: 'addNewRule',
    label: ADD_NEW_RULE,
    iconType: 'plusInCircle',
    testId: 'create-new-rule',
    isLoading: loading,
    disableButton: isDisabled,
    href: manualCreateHref,
    run: navigateToManualCreate,
  };
};
