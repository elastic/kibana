/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { TakeActionButton } from './components/take_action_button';
import { useEaseDetailsContext } from './context';
import { useBasicDataFromDetailsData } from '../document_details/shared/hooks/use_basic_data_from_details_data';
import { useAssistant } from '../document_details/right/hooks/use_assistant';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { NewAgentBuilderAttachment } from '../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../agent_builder/hooks/use_agent_builder_attachment';
import { getRawData, filterAndStringifyAlertData } from '../../assistant/helpers';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { ALERT_ATTACHMENT_PROMPT } from '../../agent_builder/components/prompts';

export const ASK_AI_ASSISTANT = i18n.translate(
  'xpack.securitySolution.flyout.right.footer.askAIAssistant',
  {
    defaultMessage: 'Ask AI Assistant',
  }
);

export const FLYOUT_FOOTER_TEST_ID = 'ease-alert-flyout-footer';

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = memo(() => {
  const { dataFormattedForFieldBrowser } = useEaseDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { showAssistant, showAssistantOverlay } = useAssistant({
    dataFormattedForFieldBrowser,
    isAlert,
  });
  const isAgentBuilderEnabled = useIsExperimentalFeatureEnabled('agentBuilderEnabled');

  const alertData = useMemo(() => {
    const rawData = getRawData(dataFormattedForFieldBrowser ?? []);
    return filterAndStringifyAlertData(rawData);
  }, [dataFormattedForFieldBrowser]);
  // This will not work until we add permissions to EASE roles for read_onechat
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.alert,
    attachmentData: { alert: alertData },
    attachmentPrompt: ALERT_ATTACHMENT_PROMPT,
  });

  return (
    <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {showAssistant && (
            <EuiFlexItem grow={false}>
              {isAgentBuilderEnabled ? (
                <NewAgentBuilderAttachment onClick={openAgentBuilderFlyout} />
              ) : (
                <NewChatByTitle
                  showAssistantOverlay={showAssistantOverlay}
                  text={ASK_AI_ASSISTANT}
                />
              )}
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
