/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildOverviewConvertPackages,
  buildOverviewPanelPackage,
  dashboardPathForId,
} from './build_packages';
import { UX_OVERVIEW_PANEL_EMBEDDABLE_ID, UX_OVERVIEW_PANEL_KINDS } from './constants';
import { serializeOverviewPanelState } from './serialize_state';
import type { UxOverviewDashboardFilters } from './types';

const filters: UxOverviewDashboardFilters = {
  serviceName: 'shop',
  rangeFrom: 'now-7d',
  rangeTo: 'now',
  kuery: 'client.geo.country_iso_code: US',
  browser: 'Chrome',
};

describe('overview dashboard packages', () => {
  it('serializes captured overview filters onto the panel', () => {
    expect(serializeOverviewPanelState('vitals', filters)).toMatchObject({
      panel: 'vitals',
      service_name: 'shop',
      range_from: 'now-7d',
      range_to: 'now',
      kuery: 'client.geo.country_iso_code: US',
      browser: 'Chrome',
    });
  });

  it('drops empty filter fields', () => {
    expect(
      serializeOverviewPanelState('kpis', {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        kuery: '  ',
      })
    ).toEqual({
      panel: 'kpis',
      range_from: 'now-24h',
      range_to: 'now',
    });
  });

  it('builds a convert package with a cover plus every overview widget', () => {
    const packages = buildOverviewConvertPackages(filters);
    expect(packages.map((pkg) => pkg.type)).toEqual(
      UX_OVERVIEW_PANEL_KINDS.map(() => UX_OVERVIEW_PANEL_EMBEDDABLE_ID)
    );
    expect(packages).toHaveLength(UX_OVERVIEW_PANEL_KINDS.length);
    expect(packages[0].serializedState).toMatchObject({
      panel: 'cover',
      service_name: 'shop',
      hide_title: true,
    });
    expect((packages[0].serializedState as { title: string }).title).toContain('shop');
  });

  it('builds a single add-to-dashboard package', () => {
    const pkg = buildOverviewPanelPackage('countries', filters, 'Visitors by country');
    expect(pkg.type).toBe(UX_OVERVIEW_PANEL_EMBEDDABLE_ID);
    expect(pkg.serializedState).toMatchObject({
      panel: 'countries',
      service_name: 'shop',
      title: 'Visitors by country',
    });
  });

  it('encodes the captured time range onto new and existing dashboard URLs', () => {
    expect(dashboardPathForId('new', { from: 'now-7d', to: 'now' })).toContain('#/create?_g=');
    expect(dashboardPathForId('abc', { from: 'now-7d', to: 'now' })).toContain('#/view/abc?_g=');
    expect(dashboardPathForId(null)).toBe('#/create');
  });

  it('seeds an App control on new dashboards only', () => {
    const control = {
      type: 'options_list_control' as const,
      width: 'medium' as const,
      grow: true as const,
      config: {
        title: 'App',
        data_view_id: 'dv-1',
        field_name: 'resource.attributes.service.name',
        selected_options: ['shop'],
        single_select: true as const,
        values_source: 'field' as const,
      },
    };
    const created = dashboardPathForId('new', { from: 'now-7d', to: 'now' }, [control]);
    expect(created).toContain('_a=');
    expect(created).toContain('pinned_panels');
    expect(created).toContain('shop');
    expect(created).toContain('options_list_control');
    expect(dashboardPathForId('abc', { from: 'now-7d', to: 'now' }, [control])).not.toContain(
      '_a='
    );
  });

  it('sizes convert panels so cover and KPIs span the row', () => {
    const packages = buildOverviewConvertPackages(filters);
    expect(packages[0].size).toEqual({ width: 48, height: 6 });
    expect(packages[1].size).toEqual({ width: 48, height: 8 });
    expect(packages[2].size?.width).toBe(24);
    expect(packages[3].size?.width).toBe(24);
    const byPanel = Object.fromEntries(
      packages.map((pkg) => [(pkg.serializedState as { panel: string }).panel, pkg.size])
    );
    expect(byPanel.sessions).toEqual({ width: 48, height: 22 });
    expect(byPanel.funnels).toEqual({ width: 48, height: 20 });
    expect(byPanel.budgets).toEqual({ width: 24, height: 18 });
    expect(byPanel.alerts).toEqual({ width: 24, height: 18 });
  });
});
