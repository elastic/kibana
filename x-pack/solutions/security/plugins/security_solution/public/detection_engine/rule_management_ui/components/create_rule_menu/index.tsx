/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiPopover,
  useEuiPaddingSize,
  EuiContextMenuItem,
  useGeneratedHtmlId,
  EuiContextMenuPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { RobotIcon } from '@kbn/ai-assistant-icon';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { useKibana } from '../../../../common/lib/kibana';
import {
  THREAT_HUNTING_AGENT_ID,
  SecurityAgentBuilderAttachments,
} from '../../../../../common/constants';

interface CreateRuleContextMenuProps {
  loading: boolean;
  isDisabled?: boolean;
}

/**
 * Alternative implementation using SecuritySolutionLinkButton components
 * for better integration with existing routing
 */
const AI_RULE_CREATION_INITIAL_MESSAGE = `Create ES|QL SIEM detection rule (name, description, data sources, detection logic, severity, risk score, schedule, tags, and MITRE ATT&CK mappings) using dedicated detection rule creation tool. 

You can review and edit everything before enabling the rule. 
Desired behavior or activity to detect:
`;

export const CreateRuleMenu: React.FC<CreateRuleContextMenuProps> = ({ loading, isDisabled }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'createRuleContextMenuLinks',
  });
  const { services } = useKibana();
  const { agentBuilder, application } = services;

  const m = useEuiPaddingSize('m');
  const xl = useEuiPaddingSize('xl');
  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleAiRuleCreation = useCallback(() => {
    closePopover();

    // Navigate to rule creation page with query parameter to indicate AI rule creation
    application.navigateToApp('securitySolutionUI', {
      path: '/rules/create?fromAiRuleCreation=true',
    });

    // Create empty rule attachment for new rule creation
    const emptyRule = {};
    const emptyRuleAttachment: AttachmentInput = {
      id: `empty-rule-${Date.now()}`,
      type: SecurityAgentBuilderAttachments.rule,
      data: {
        text: JSON.stringify(emptyRule),
        attachmentLabel: 'New Rule',
      },
    };

    // Open agent builder flyout with initial message and empty rule attachment
    if (agentBuilder?.openConversationFlyout) {
      agentBuilder.openConversationFlyout({
        newConversation: true,
        initialMessage: AI_RULE_CREATION_INITIAL_MESSAGE,
        autoSendInitialMessage: false,
        sessionTag: 'security',
        agentId: THREAT_HUNTING_AGENT_ID,
        attachments: [emptyRuleAttachment],
      });
    }
  }, [closePopover, application, agentBuilder]);

  const createRuleButton = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      fill
      isDisabled={isDisabled}
      isLoading={loading}
      data-test-subj={`create-rule-button`}
    >
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.contextMenu.buttonLabel"
        defaultMessage="Create a rule"
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={createRuleButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj={'create-rule-context-menu-popover'}
    >
      <EuiContextMenuPanel>
        <EuiContextMenuItem
          key="ai-rule-creation"
          style={{ padding: `${m} ${xl}` }}
          onClick={handleAiRuleCreation}
          data-test-subj="ai-rule-creation"
          icon={<RobotIcon size="m" />}
        >
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation"
            defaultMessage="AI rule creation"
          />
        </EuiContextMenuItem>
        <EuiHorizontalRule key="separator" margin="none" />
        <EuiContextMenuItem key="manual-rule-creation" style={{ padding: `${m} ${xl}` }}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.rulesCreate}
            data-test-subj="manual-rule-creation"
            color="text"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.createRule.contextMenu.manual"
              defaultMessage="Manual rule creation"
            />
          </SecuritySolutionLinkAnchor>
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};
