/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const UX_OVERVIEW_PANEL_EMBEDDABLE_ID = 'ux_overview_panel';

export const UX_OVERVIEW_CHART_PANEL_KINDS = [
  'cover',
  'kpis',
  'vitals',
  'trends',
  'frustration',
  'browsers',
  'countries',
  'pages',
] as const;

export const UX_OVERVIEW_WORKFLOW_PANEL_KINDS = [
  'sessions',
  'funnels',
  'budgets',
  'alerts',
] as const;

export const UX_OVERVIEW_PANEL_KINDS = [
  ...UX_OVERVIEW_CHART_PANEL_KINDS,
  ...UX_OVERVIEW_WORKFLOW_PANEL_KINDS,
] as const;

export type UxOverviewChartPanelKind = (typeof UX_OVERVIEW_CHART_PANEL_KINDS)[number];
export type UxOverviewWorkflowPanelKind = (typeof UX_OVERVIEW_WORKFLOW_PANEL_KINDS)[number];
export type UxOverviewPanelKind = (typeof UX_OVERVIEW_PANEL_KINDS)[number];

export const isUxOverviewPanelKind = (value: string): value is UxOverviewPanelKind =>
  (UX_OVERVIEW_PANEL_KINDS as readonly string[]).includes(value);

export const isUxOverviewWorkflowPanelKind = (
  value: string
): value is UxOverviewWorkflowPanelKind =>
  (UX_OVERVIEW_WORKFLOW_PANEL_KINDS as readonly string[]).includes(value);

export const UX_OVERVIEW_PANEL_SIZES: Record<
  UxOverviewPanelKind,
  { width: number; height: number }
> = {
  cover: { width: 48, height: 6 },
  kpis: { width: 48, height: 8 },
  vitals: { width: 24, height: 18 },
  trends: { width: 24, height: 18 },
  frustration: { width: 24, height: 16 },
  browsers: { width: 24, height: 16 },
  countries: { width: 48, height: 22 },
  pages: { width: 48, height: 14 },
  sessions: { width: 48, height: 22 },
  funnels: { width: 48, height: 20 },
  budgets: { width: 24, height: 18 },
  alerts: { width: 24, height: 18 },
};
