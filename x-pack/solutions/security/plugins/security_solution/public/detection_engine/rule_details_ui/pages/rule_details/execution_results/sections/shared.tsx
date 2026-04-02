/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

const tooltipListCss = css`
  list-style: disc;
  padding-left: 16px;
  margin: 0;

  li + li {
    margin-top: 4px;
  }
`;

interface TooltipItem {
  title: string;
  description: string;
}

export const Tooltip: React.FC<{ items: TooltipItem[] }> = ({ items }) => (
  <ul css={tooltipListCss}>
    {items.map(({ title, description }) => (
      <li key={title}>
        <strong>
          {title}
          {':'}
        </strong>{' '}
        {description}
      </li>
    ))}
  </ul>
);

export const AccordionButtonContent: React.FC<{
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}> = ({ children, tooltip }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <span>{children}</span>
      </EuiTitle>
    </EuiFlexItem>
    {tooltip && (
      <EuiFlexItem grow={false}>
        <EuiIconTip content={tooltip} type="question" color="subdued" />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

export const FieldLabel: React.FC<{ label: string }> = ({ label }) => (
  <EuiText size="s">
    <strong>{label}</strong>
  </EuiText>
);

export const SectionSeparator: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return <EuiFlexItem grow={false} css={{ borderLeft: `${euiTheme.border.thin}` }} />;
};
