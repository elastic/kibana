/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { TakeActionButton } from './components/take_action_button';
import { useAIForSOCDetailsContext } from './context';
import { useBasicDataFromDetailsData } from '../document_details/shared/hooks/use_basic_data_from_details_data';
import { useAssistant } from '../document_details/right/hooks/use_assistant';

export const ASK_AI_ASSISTANT = i18n.translate(
  'xpack.securitySolution.flyout.right.footer.askAIAssistant',
  {
    defaultMessage: 'Ask AI Assistant',
  }
);

export const FLYOUT_FOOTER_TEST_ID = 'ai-for-soc-alert-flyout-footer';

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = memo(() => {
  const { dataFormattedForFieldBrowser } = useAIForSOCDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { showAssistant, showAssistantOverlay } = useAssistant({
    dataFormattedForFieldBrowser,
    isAlert,
  });

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
});

PanelFooter.displayName = 'PanelFooter';
