/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { ChatActions } from '@kbn/elastic-assistant/impl/assistant/chat_actions';

import { PromptTextArea } from './prompt_textarea';

interface PromptComponentProps {
  handlePromptSubmit: () => void;
  setPromptValue: (value: string) => void;
  promptValue: string;
  isLoading: boolean;
  isValid: boolean;
  onSendMessage: () => void;
  isAiRuleCreationInProgress: boolean;
  isDisabled: boolean;
}

export const PromptComponent: React.FC<PromptComponentProps> = ({
  handlePromptSubmit,
  setPromptValue,
  promptValue,
  isLoading,
  isValid,
  onSendMessage,
  isAiRuleCreationInProgress,
  isDisabled,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        gutterSize="none"
        alignItems={'flexEnd'}
        css={css`
          position: relative;
        `}
      >
        <EuiFlexItem
          css={css`
            width: 100%;
          `}
        >
          <PromptTextArea
            onPromptSubmit={handlePromptSubmit}
            setUserPrompt={setPromptValue}
            value={promptValue}
            isDisabled={isDisabled || isLoading || isAiRuleCreationInProgress}
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            right: 0;
            position: absolute;
            margin-right: ${euiTheme.size.s};
            margin-bottom: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <ChatActions
            isDisabled={isLoading && isValid}
            isLoading={isAiRuleCreationInProgress}
            onSendMessage={onSendMessage}
            promptValue={promptValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
