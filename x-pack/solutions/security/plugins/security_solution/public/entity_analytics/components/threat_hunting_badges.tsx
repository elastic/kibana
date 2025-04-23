/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type {
  ThreatHuntingQuery,
  ThreatHuntingQueryIndexStatus,
} from '../../../common/api/entity_analytics/threat_hunting/common.gen';

export const CATEGORY_COLOUR_MAP: Record<string, string> = {
  windows: '#a7d0f4',
  linux: '#ffebc0',
  macos: '#c1ecea',
  llm: '#f4d0cf',
  azure: '#d7c8f2',
  okta: '#c0e8e5',
  aws: '#fbd0e6',
};

export const IndexStatusBadge: React.FC<{ status?: ThreatHuntingQueryIndexStatus }> = ({
  status,
}) => {
  return (
    <EuiBadge
      color={
        status === 'all'
          ? 'success'
          : status === 'some'
          ? 'warning'
          : status === 'none'
          ? 'danger'
          : 'ghost'
      }
      iconType={status === 'all' ? 'check' : status === 'some' ? 'warning' : 'cross'}
      iconSide="left"
    >
      {status === 'all'
        ? 'All indices available'
        : status === 'some'
        ? 'Some indices available'
        : status === 'none'
        ? 'No indices available'
        : 'Unknown'}
    </EuiBadge>
  );
};

export const ESQLBadge = () => <EuiBadge iconType="search" color="primary">{`ES|QL`}</EuiBadge>;

export const QueryCountBadge: React.FC<{ query: ThreatHuntingQuery }> = ({ query }) => {
  return (
    <EuiBadge color="hollow" iconType="search">
      {`${query.queries.length} ${query.queries.length === 1 ? 'query' : 'queries'}`}
    </EuiBadge>
  );
};

export const CategoryBadge: React.FC<{ category?: string }> = ({ category }) => {
  if (!category) {
    return <EuiBadge color="hollow">{'misc'}</EuiBadge>;
  }

  return <EuiBadge color={CATEGORY_COLOUR_MAP[category] || 'hollow'}>{category}</EuiBadge>;
};
