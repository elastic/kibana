/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export interface AttentionSignalCardProps {
  title: string;
  count: number;
  description?: string;
  isLoading?: boolean;
}

export const AttentionSignalCard: React.FC<AttentionSignalCardProps> = ({
  title,
  count,
  description,
  isLoading,
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="eaFaceliftAttentionSignalCard">
    {isLoading ? (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ minHeight: 60 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <>
        <EuiStat
          title={count}
          description={title}
          titleSize="l"
          titleColor={count > 0 ? 'danger' : 'subdued'}
          descriptionElement="p"
          data-test-subj="eaFaceliftAttentionSignalCount"
        />
        {description && (
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        )}
      </>
    )}
  </EuiPanel>
);

export interface AttentionSignalGridProps {
  children: React.ReactNode;
}

export const AttentionSignalGrid: React.FC<AttentionSignalGridProps> = ({ children }) => (
  <>
    <EuiTitle size="s">
      <h3>{'Signal overview'}</h3>
    </EuiTitle>
    <EuiFlexGroup gutterSize="m" wrap responsive={false} data-test-subj="eaFaceliftSignalGrid">
      {React.Children.map(children, (child) => (
        <EuiFlexItem grow={false} style={{ minWidth: 180 }}>
          {child}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </>
);
