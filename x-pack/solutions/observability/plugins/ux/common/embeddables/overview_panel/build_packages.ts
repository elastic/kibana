/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import {
  UX_OVERVIEW_PANEL_EMBEDDABLE_ID,
  UX_OVERVIEW_PANEL_KINDS,
  UX_OVERVIEW_PANEL_SIZES,
  type UxOverviewPanelKind,
} from './constants';
import { uxOverviewConvertTitle, uxOverviewPanelTitle } from './panel_copy';
import { serializeOverviewPanelState } from './serialize_state';
import type { UxOverviewDashboardFilters, UxOverviewPanelEmbeddableState } from './types';
import type { UxDashboardAppControlPanel } from './app_control';

export interface UxDashboardEmbeddablePackage {
  type: string;
  serializedState: UxOverviewPanelEmbeddableState | Record<string, unknown>;
  size?: { width: number; height: number };
}

export const dashboardPathForId = (
  dashboardId: string | null,
  timeRange?: { from: string; to: string },
  pinnedPanels?: UxDashboardAppControlPanel[]
): string => {
  const isNew = !dashboardId || dashboardId === 'new';
  const base = isNew ? '#/create' : `#/view/${dashboardId}`;
  const params: string[] = [];
  if (timeRange) {
    params.push(`_g=${encodeRison({ time: { from: timeRange.from, to: timeRange.to } })}`);
  }
  if (isNew && pinnedPanels?.length) {
    params.push(`_a=${encodeRison({ pinned_panels: pinnedPanels })}`);
  }
  return params.length ? `${base}?${params.join('&')}` : base;
};

export const buildOverviewPanelPackage = (
  panel: UxOverviewPanelKind,
  filters: UxOverviewDashboardFilters,
  title?: string
): UxDashboardEmbeddablePackage => ({
  type: UX_OVERVIEW_PANEL_EMBEDDABLE_ID,
  serializedState: {
    ...serializeOverviewPanelState(panel, filters),
    title:
      title ??
      (panel === 'cover'
        ? uxOverviewConvertTitle(filters.serviceName)
        : uxOverviewPanelTitle(panel)),
    ...(panel === 'cover' ? { hide_title: true } : {}),
  },
  size: UX_OVERVIEW_PANEL_SIZES[panel],
});

export const buildOverviewConvertPackages = (
  filters: UxOverviewDashboardFilters
): UxDashboardEmbeddablePackage[] =>
  UX_OVERVIEW_PANEL_KINDS.map((panel) => buildOverviewPanelPackage(panel, filters));
