/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

interface CatalogDataSourceBadgeProps {
  integrationTitle?: string;
  freshness: string;
  docCount: number;
  ecsFieldCoverage: number;
}

const freshnessColors: Record<string, string> = {
  live: 'success',
  recent: 'primary',
  stale: 'warning',
  empty: 'danger',
};

export const CatalogDataSourceBadge: React.FC<CatalogDataSourceBadgeProps> = ({
  integrationTitle,
  freshness,
  docCount,
  ecsFieldCoverage,
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    {integrationTitle && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{integrationTitle}</EuiBadge>
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={`${docCount.toLocaleString()} documents, ${Math.round(
          ecsFieldCoverage * 100
        )}% ECS coverage`}
      >
        <EuiBadge color={freshnessColors[freshness] ?? 'default'}>{freshness}</EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);
