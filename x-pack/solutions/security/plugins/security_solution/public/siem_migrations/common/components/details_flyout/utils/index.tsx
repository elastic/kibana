/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiTabbedContent, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { EuiTabbedContentProps } from '@elastic/eui';
import { css } from '@emotion/react';

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
export const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiTabbedContent {...props} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const useTabStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    padding: 0 ${euiTheme.size.m} ${euiTheme.size.xl} ${euiTheme.size.m};
  `;
};

export const TabContentPadding: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const tabPaddingClassName = useTabStyles();
  return <div css={tabPaddingClassName}>{children}</div>;
};
