/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/**
 * Minimal 40px toolbar header matching the Security alerts flyout pattern.
 * `children` are right-aligned; optional `leftContent` is left-aligned.
 */
export function FlyoutToolbarHeader({
  children,
  leftContent,
}: {
  children: React.ReactNode;
  leftContent?: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const edgePadding = `calc(${euiTheme.size.xs} + ${euiTheme.size.s})`;
  const hasLeftContent = leftContent != null;
  return (
    <EuiFlyoutHeader
      hasBorder
      css={css`
        && {
          padding: 0 ${edgePadding} 0 ${hasLeftContent ? edgePadding : '0'};
        }
      `}
    >
      <EuiFlexGroup
        justifyContent={hasLeftContent ? 'spaceBetween' : 'flexEnd'}
        alignItems="center"
        responsive={false}
        gutterSize="xs"
        css={css`
          height: ${euiTheme.size.xxl};
        `}
      >
        {hasLeftContent ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
                {leftContent}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
                {children}
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        ) : (
          children
        )}
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
}
