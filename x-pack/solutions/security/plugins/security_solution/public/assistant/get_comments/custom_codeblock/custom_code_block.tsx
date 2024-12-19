/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export const CustomCodeBlock = ({ value }: { value: string }) => {
  const theme = useEuiTheme();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      className={css`
        background-color: ${theme.euiTheme.colors.lightestShade};
        .euiCodeBlock__pre {
          margin-bottom: 0;
          padding: ${theme.euiTheme.size.m};
          min-block-size: 48px;
        }
        .euiCodeBlock__controls {
          inset-block-start: ${theme.euiTheme.size.m};
          inset-inline-end: ${theme.euiTheme.size.m};
        }
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiCodeBlock isCopyable fontSize="m">
            {value}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
