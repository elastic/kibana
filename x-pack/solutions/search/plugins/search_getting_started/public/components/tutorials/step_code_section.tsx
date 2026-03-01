/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { StepStatus } from './tutorial_state';
import type { EsResponse } from '../../hooks/use_execute_tutorial_step';

export interface StepCodeSectionProps {
  apiSnippet: string;
  status: StepStatus;
  response?: EsResponse;
  error?: string;
  isReady: boolean;
  onExecute: () => void;
}

const PLACEHOLDER_TEXT = i18n.translate(
  'xpack.searchGettingStarted.tutorial.stepCode.placeholder',
  { defaultMessage: 'Execute API call to see result' }
);

const formatResponseBody = (response: EsResponse): string => {
  try {
    return JSON.stringify(response.body, null, 2);
  } catch {
    return String(response.body);
  }
};

const ResponsePane: React.FC<Pick<StepCodeSectionProps, 'status' | 'response' | 'error'>> = ({
  status,
  response,
  error,
}) => {
  if (status === 'running') {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        css={css`
          min-height: 120px;
        `}
      >
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (status === 'failed' && error) {
    return (
      <EuiCodeBlock
        language="json"
        fontSize="s"
        paddingSize="m"
        overflowHeight={300}
        isCopyable
      >
        {error}
      </EuiCodeBlock>
    );
  }

  if (status === 'completed' && response) {
    return (
      <EuiCodeBlock
        language="json"
        fontSize="s"
        paddingSize="m"
        overflowHeight={300}
        isCopyable
      >
        {formatResponseBody(response)}
      </EuiCodeBlock>
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      css={css`
        min-height: 120px;
      `}
    >
      <EuiText size="s" color="subdued">
        {PLACEHOLDER_TEXT}
      </EuiText>
    </EuiFlexGroup>
  );
};

export const StepCodeSection: React.FC<StepCodeSectionProps> = ({
  apiSnippet,
  status,
  response,
  error,
  isReady,
  onExecute,
}) => {
  const isExecuting = status === 'running';
  const canExecute = isReady && !isExecuting;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="stretch" responsive={false}>
      <EuiFlexItem grow={5}>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          overflowHeight={300}
          isCopyable
        >
          {apiSnippet}
        </EuiCodeBlock>
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          justify-content: center;
          align-items: center;
        `}
      >
        <EuiToolTip
          content={
            !isReady
              ? i18n.translate(
                  'xpack.searchGettingStarted.tutorial.stepCode.notReady',
                  { defaultMessage: 'Complete previous steps first' }
                )
              : i18n.translate(
                  'xpack.searchGettingStarted.tutorial.stepCode.execute',
                  { defaultMessage: 'Run' }
                )
          }
        >
          <EuiButtonIcon
            iconType="playFilled"
            aria-label={i18n.translate(
              'xpack.searchGettingStarted.tutorial.stepCode.executeAriaLabel',
              { defaultMessage: 'Execute API call' }
            )}
            color="primary"
            display="fill"
            size="m"
            isDisabled={!canExecute}
            isLoading={isExecuting}
            onClick={onExecute}
            data-test-subj="stepExecuteButton"
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={5}>
        <ResponsePane status={status} response={response} error={error} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
