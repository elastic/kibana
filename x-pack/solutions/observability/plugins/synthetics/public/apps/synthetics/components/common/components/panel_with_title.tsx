/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPanelProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';

export const PanelWithTitle: React.FC<
  { title?: string; titleLeftAlign?: boolean; margin?: string; helpText?: string } & EuiPanelProps
> = ({
  title,
  hasBorder = true,
  hasShadow = false,
  children,
  titleLeftAlign,
  margin,
  helpText,
  ...props
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={hasShadow} {...props}>
      {title && (
        <EuiTitle size="xs">
          <h3
            css={{
              margin: margin ?? euiTheme.size.s,
              marginBottom: 0,
              ...(titleLeftAlign ? { marginLeft: 0 } : {}),
            }}
          >
            {helpText ? (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{title}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip type="question" content={helpText} position="top" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              title
            )}
          </h3>
        </EuiTitle>
      )}
      {children}
    </EuiPanel>
  );
};
