/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';

import { type SuggestedPrompt } from '../../../common/prompts';
import { SuggestedPromptText } from './styles';

interface SuggestedPromptCardProps {
  prompt: SuggestedPrompt;
  onClick: (prompt: SuggestedPrompt) => void;
}

export const SuggestedPromptCard = ({ prompt, onClick }: SuggestedPromptCardProps) => {
  return (
    <EuiPanel
      color="subdued"
      paddingSize="m"
      hasBorder
      hasShadow={false}
      onClick={() => onClick(prompt)}
      data-test-subj={`searchGettingStartedSuggestedPrompt-${prompt.id}`}
      aria-label={prompt.prompt}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" size="m" aria-hidden={true} color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p css={SuggestedPromptText}>{prompt.prompt}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
