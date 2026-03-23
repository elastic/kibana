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
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';

interface CreateRuleContextMenuProps {
  loading: boolean;
  isDisabled?: boolean;
}

/**
 * Alternative implementation using SecuritySolutionLinkButton components
 * for better integration with existing routing
 */
export const CreateRuleMenu: React.FC<CreateRuleContextMenuProps> = ({ loading, isDisabled }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'createRuleContextMenuLinks',
  });

  const m = useEuiPaddingSize('m');
  const xl = useEuiPaddingSize('xl');
  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

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
        <EuiContextMenuItem key="ai-rule-creation" style={{ padding: `${m} ${xl}` }}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.aiRuleCreation}
            data-test-subj="ai-rule-creation"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation"
              defaultMessage="AI rule creation"
            />
          </SecuritySolutionLinkAnchor>
        </EuiContextMenuItem>
        <EuiHorizontalRule key="separator" margin="none" />
        <EuiContextMenuItem key="manual-rule-creation" style={{ padding: `${m} ${xl}` }}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.rulesCreate}
            data-test-subj="manual-rule-creation"
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
