/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../shared/context';
import { useAssistant } from './hooks/use_assistant';
import { FLYOUT_FOOTER_TEST_ID } from './test_ids';
import { TakeActionButton } from '../shared/components/take_action_button';

export const ASK_AI_ASSISTANT = i18n.translate(
  'xpack.securitySolution.ai4soc.flyout.right.footer.askAIAssistant',
  {
    defaultMessage: 'Ask AI Assistant',
  }
);

interface PanelFooterProps {
  /**
   * Boolean that indicates whether flyout is in preview and action should be hidden
   */
  isRulePreview: boolean;
}

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter: FC<PanelFooterProps> = ({ isRulePreview }) => {
  const { dataFormattedForFieldBrowser } = useDocumentDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { showAssistant, showAssistantOverlay } = useAssistant({
    dataFormattedForFieldBrowser,
    isAlert,
  });

  if (isRulePreview) return null;

  return (
    <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {showAssistant && (
            <EuiFlexItem grow={false}>
              <NewChatByTitle showAssistantOverlay={showAssistantOverlay} text={ASK_AI_ASSISTANT} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TakeActionButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};

PanelFooter.displayName = 'PanelFooter';
