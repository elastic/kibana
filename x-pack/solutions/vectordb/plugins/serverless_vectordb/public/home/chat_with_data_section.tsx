/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const ChatWithYourDataSection = () => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

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
      <EuiPanel hasShadow={false} hasBorder={true} paddingSize="none" grow={false}>
        <EuiCodeBlock
          language="bash"
          transparentBackground
          isCopyable
          paddingSize="none"
          fontSize="m"
          css={css`
            margin: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s};
          `}
        >
          {'$ npx skills add elastic/agent-skills'}
        </EuiCodeBlock>
      </EuiPanel>
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
          size="m"
          onClick={() => agentBuilder.toggleChat()}
          data-test-subj="openElasticAgentButton"
          data-telemetry-id="serverlessVectordb-home-chat-openElasticAgent"
          iconType="productAgent"
        >
          {i18n.translate('xpack.serverlessVectordb.home.chat.openAgent', {
            defaultMessage: 'Open Elastic Agent',
          })}
        </EuiButton>
      </span>
    </>
  );
};
