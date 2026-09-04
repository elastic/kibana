/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { buildUxAppControlPanel, serviceNameFromDashboardFilters } from './app_control';

const phrase = (key: string, value: string, extras: Partial<Filter['meta']> = {}): Filter =>
  ({
    meta: {
      alias: null,
      disabled: false,
      negate: false,
      key,
      params: { query: value },
      type: 'phrase',
      ...extras,
    },
    query: { match_phrase: { [key]: value } },
  } as Filter);

describe('overview dashboard app control', () => {
  it('builds a pre-selected options list for the app', () => {
    expect(buildUxAppControlPanel('dv-1', 'resource.attributes.service.name', 'shop')).toEqual({
      type: 'options_list_control',
      width: 'medium',
      grow: true,
      config: {
        title: 'App',
        data_view_id: 'dv-1',
        field_name: 'resource.attributes.service.name',
        selected_options: ['shop'],
        single_select: true,
        values_source: 'field',
      },
    });
  });

  it('reads the app name from a dashboard phrase filter', () => {
    expect(
      serviceNameFromDashboardFilters([
        phrase('resource.attributes.service.name', 'kibana-pr-284540'),
      ])
    ).toBe('kibana-pr-284540');
    expect(serviceNameFromDashboardFilters([phrase('service.name', 'shop')])).toBe('shop');
    expect(
      serviceNameFromDashboardFilters([phrase('resource.attributes.service.name.keyword', 'shop')])
    ).toBe('shop');
  });

  it('ignores disabled, negated, and unrelated filters', () => {
    expect(
      serviceNameFromDashboardFilters([
        phrase('resource.attributes.service.name', 'shop', { disabled: true }),
        phrase('user_agent.name', 'Chrome'),
        phrase('resource.attributes.service.name', 'checkout', { negate: true }),
      ])
    ).toBeUndefined();
  });
});
