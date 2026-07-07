/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { rgba } from 'polished';
import React from 'react';
import { useTheme } from '../../../hooks/use_theme';

export function RootCauseAnalysisPanel({
  children,
  color,
}: {
  children: React.ReactElement;
  color?: React.ComponentProps<typeof EuiPanel>['color'];
}) {
  const theme = useTheme();

  const isSeverityColor = color === 'risk' || color === 'neutral';
  const panelClassName =
    color &&
    color !== 'transparent' &&
    color !== 'plain' &&
    color !== 'subdued' &&
    color !== 'highlighted'
      ? css`
          border: 1px solid;
          border-color: ${rgba(
            isSeverityColor ? theme.colors.severity[color] : theme.colors[color],
            0.25
          )};
        `
      : undefined;

  return (
    <EuiPanel hasBorder paddingSize="l" color={color} className={panelClassName}>
      {children}
    </EuiPanel>
  );
}
