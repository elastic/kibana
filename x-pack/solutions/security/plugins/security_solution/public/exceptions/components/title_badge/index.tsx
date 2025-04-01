/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { css } from '@emotion/css';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';

interface TitleBadgeProps {
  title: string;
  badgeString: string;
}

export const TitleBadge = memo<TitleBadgeProps>(({ title, badgeString }) => {
  const { euiTheme } = useEuiTheme();
  const itemStyles = css`
    border-right: ${euiTheme.border.thin};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} 0;
  `;
  const titleTextStyles = css`
    width: max-content;
  `;

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiText className={titleTextStyles} grow size="xs">
          {`${title}:`}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem className={itemStyles}>
        <EuiBadge>{badgeString}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TitleBadge.displayName = 'TitleBadge';
