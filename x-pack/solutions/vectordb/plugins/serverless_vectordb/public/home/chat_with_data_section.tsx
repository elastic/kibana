/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const ChatWithYourDataSection = () => {
  const {
    services: { agentBuilder },
  } = useKibana();

  return (
    <>
      <EuiTitle size="s">
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
      <EuiCodeBlock language="bash" isCopyable paddingSize="s" fontSize="m">
        {'$ npx skills add elastic/agent-skills'}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.serverlessVectordb.home.chat.skipSetup', {
            defaultMessage: 'Skip the setup and use with our agent.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButton
        onClick={() => agentBuilder.toggleChat()}
        data-test-subj="openElasticAgentButton"
        data-telemetry-id="serverlessVectordb-home-chat-openElasticAgent"
      >
        {i18n.translate('xpack.serverlessVectordb.home.chat.openAgent', {
          defaultMessage: 'Open Elastic Agent',
        })}
      </EuiButton>
    </>
  );
};
