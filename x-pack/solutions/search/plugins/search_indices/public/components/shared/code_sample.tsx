/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// Disabled so we can track the on copy event by adding an onClick to a div
/* eslint-disable jsx-a11y/click-events-have-key-events */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiThemeProvider,
} from '@elastic/eui';

export interface CodeSampleProps {
  id?: string;
  title: string;
  description?: string;
  language: string;
  code: string;
  onCodeCopyClick?: React.MouseEventHandler<HTMLElement>;
}

export const CodeSample = ({
  id,
  title,
  language,
  code,
  onCodeCopyClick,
  description,
}: CodeSampleProps) => {
  const onCodeClick = React.useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      if (onCodeCopyClick === undefined) return;
      if (e.target instanceof HTMLElement) {
        if (e.target.dataset?.testSubj === 'euiCodeBlockCopy') {
          onCodeCopyClick(e);
        }
      }
    },
    [onCodeCopyClick]
  );

  return (
    <EuiFlexItem id={id}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="s" grow={false}>
            <p>{description}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiThemeProvider colorMode="dark">
        <EuiPanel color="subdued" paddingSize="none" hasShadow={false}>
          <div onClick={onCodeClick}>
            <EuiCodeBlock
              data-test-subj={`${id}-code-block`}
              language={language}
              fontSize="m"
              paddingSize="m"
              isCopyable
              transparentBackground
              css={{
                '*::selection': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {code}
            </EuiCodeBlock>
          </div>
        </EuiPanel>
      </EuiThemeProvider>
    </EuiFlexItem>
  );
};
