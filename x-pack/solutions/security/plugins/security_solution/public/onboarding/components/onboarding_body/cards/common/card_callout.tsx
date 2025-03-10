/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import type { EuiCallOutProps, IconType } from '@elastic/eui';

export interface CardCallOutProps {
  text: React.ReactNode;
  color?: EuiCallOutProps['color'];
  icon?: IconType;
  action?: React.ReactNode;
  size?: EuiCallOutProps['size'];
}

export const CardCallOut = React.memo<CardCallOutProps>(({ text, color, icon, action, size }) => {
  return (
    <EuiCallOut size={size} color={color}>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {icon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{text}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {action && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{action}</EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
});
CardCallOut.displayName = 'CardCallOut';
