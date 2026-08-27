/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { OTEL_SERVICE_NAME } from '../../otel_rum';
import { SERVICE_NAME } from '../../elasticsearch_fieldnames';
import { uxOverviewAppControlTitle } from './panel_copy';

export const UX_APP_CONTROL_FIELDS = [
  OTEL_SERVICE_NAME,
  'attributes.service.name',
  SERVICE_NAME,
] as const;

export interface UxDashboardAppControlPanel {
  type: 'options_list_control';
  width: 'medium';
  grow: true;
  config: {
    title: string;
    data_view_id: string;
    field_name: string;
    selected_options: string[];
    single_select: true;
    values_source: 'field';
  };
}

export const buildUxAppControlPanel = (
  dataViewId: string,
  fieldName: string,
  serviceName: string
): UxDashboardAppControlPanel => ({
  type: 'options_list_control',
  width: 'medium',
  grow: true,
  config: {
    title: uxOverviewAppControlTitle(),
    data_view_id: dataViewId,
    field_name: fieldName,
    selected_options: [serviceName],
    single_select: true,
    values_source: 'field',
  },
});

const stripKeyword = (key: string): string =>
  key.endsWith('.keyword') ? key.slice(0, -'.keyword'.length) : key;

const isAppField = (key?: string): boolean => {
  if (!key) {
    return false;
  }
  const names = UX_APP_CONTROL_FIELDS as readonly string[];
  return names.includes(key) || names.includes(stripKeyword(key));
};

const phraseValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === 'object' && 'query' in value) {
    const query = (value as { query?: unknown }).query;
    if (typeof query === 'string' && query.trim()) {
      return query.trim();
    }
  }
  return undefined;
};

/** App name from a dashboard control / filter pill, if one is set. */
export const serviceNameFromDashboardFilters = (
  filters: Filter[] | undefined
): string | undefined => {
  if (!filters?.length) {
    return undefined;
  }
  for (const filter of filters) {
    if (filter.meta.disabled || filter.meta.negate) {
      continue;
    }
    const key = filter.meta.key;
    if (!isAppField(key)) {
      continue;
    }
    const fromParams = phraseValue(filter.meta.params);
    if (fromParams) {
      return fromParams;
    }
    const matchPhrase = (filter.query as { match_phrase?: Record<string, unknown> } | undefined)
      ?.match_phrase;
    if (matchPhrase && key) {
      const fromQuery = phraseValue(matchPhrase[key]);
      if (fromQuery) {
        return fromQuery;
      }
    }
  }
  return undefined;
};
