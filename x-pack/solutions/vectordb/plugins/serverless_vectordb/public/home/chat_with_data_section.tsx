/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon, EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const ChatWithYourDataSection = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { agentBuilder },
  } = useKibana();

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.serverlessVectordb.home.chat.title', {
            defaultMessage: 'Chat with your data',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.serverlessVectordb.home.chat.description', {
            defaultMessage:
              'Setup our official Elasticsearch skills in your preferred agentic code workflow.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel color="subdued" paddingSize="s" grow={false}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={true} css={{ borderRight: euiTheme.border.thin }}>
            <EuiCodeBlock language="bash" transparentBackground isCopyable={false} paddingSize="none" fontSize="m">
              {'$ npx skills add elastic/agent-skills'}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="copy" color="text" display="empty" onClick={() => { navigator.clipboard.writeText('$ npx skills add elastic/agent-skills'); }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel >
      <EuiSpacer size="l" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.serverlessVectordb.home.chat.skipSetupTitle', {
            defaultMessage: 'Or skip the setup and start chatting now.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <span>
        <EuiButton
          color="text"
          onClick={() => agentBuilder.toggleChat()}
          data-test-subj="openElasticAgentButton"
          data-telemetry-id="serverlessVectordb-home-chat-openElasticAgent"
        >
          {i18n.translate('xpack.serverlessVectordb.home.chat.openAgent', {
            defaultMessage: 'Open Elastic Agent',
          })}
        </EuiButton>
      </span>
    </>
  );
};
