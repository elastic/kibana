/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';

const FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.filtersLabel',
  { defaultMessage: 'Filters' }
);
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

const formatRangeFilter = (key: string, params: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (params.gte !== undefined) {
    parts.push(`>= ${params.gte}`);
  } else if (params.gt !== undefined) {
    parts.push(`> ${params.gt}`);
  }
  if (params.lte !== undefined) {
    parts.push(`<= ${params.lte}`);
  } else if (params.lt !== undefined) {
    parts.push(`< ${params.lt}`);
  }
  return `${key}: ${parts.join(' AND ')}`;
};

const resolveParamValue = (params: Filter['meta']['params']): string => {
  if (params == null) return '';
  if (typeof params === 'string' || typeof params === 'number' || typeof params === 'boolean') {
    return String(params);
  }
  if (Array.isArray(params)) return params.join(', ');
  if (typeof params === 'object' && 'query' in params) return String(params.query);
  return JSON.stringify(params);
};

const formatPhraseFilter = (
  key: string,
  value: Filter['meta']['value'],
  params: Filter['meta']['params']
): string => {
  const display = typeof value === 'string' ? value : resolveParamValue(params);
  return `${key}: ${display}`;
};

export const getFilterLabel = (filter: Filter): string => {
  if (filter.meta?.alias) {
    return filter.meta.alias;
  }
  const { key, negate, type, params, value } = filter.meta ?? {};
  const prefix = negate ? 'NOT ' : '';

  if (!key) {
    return `${prefix}${JSON.stringify(filter.query ?? filter)}`;
  }

  if (type === 'exists') {
    return `${prefix}${key}: exists`;
  }

  if (type === 'phrase' || type === 'phrases') {
    return `${prefix}${formatPhraseFilter(key, value, params)}`;
  }

  if (type === 'range' && params && typeof params === 'object' && !Array.isArray(params)) {
    return `${prefix}${formatRangeFilter(key, params as Record<string, unknown>)}`;
  }

  const displayValue = typeof value === 'string' ? value : resolveParamValue(params);
  return displayValue ? `${prefix}${key}: ${displayValue}` : `${prefix}${key}`;
};

export const FiltersDisplay: React.FC<{ filters: unknown[] }> = ({ filters }) => {
  const validFilters = filters.filter(
    (f): f is Filter => f != null && typeof f === 'object' && 'meta' in f
  );
  if (validFilters.length === 0) {
    return null;
  }

  return (
    <>
      <SectionHeading>{FILTERS_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
        {validFilters.map((filter, idx) => (
          <EuiFlexItem grow={false} key={idx}>
            <EuiBadge color="hollow">{getFilterLabel(filter)}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
