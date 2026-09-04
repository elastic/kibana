/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UxOverviewPanelKind } from './constants';
import type { UxOverviewDashboardFilters, UxOverviewPanelCustomState } from './types';

const optional = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const serializeOverviewPanelState = (
  panel: UxOverviewPanelKind,
  filters: UxOverviewDashboardFilters
): UxOverviewPanelCustomState => {
  const state: UxOverviewPanelCustomState = {
    panel,
    service_name: optional(filters.serviceName),
    range_from: filters.rangeFrom,
    range_to: filters.rangeTo,
    kuery: optional(filters.kuery),
    browser: optional(filters.browser),
    os: optional(filters.os),
    location: optional(filters.location),
    page_url: optional(filters.pageUrl),
    frustration: optional(filters.frustration),
    user: optional(filters.user),
    include_bots: optional(filters.includeBots),
    bot_ua: optional(filters.botUa),
    breakpoint: optional(filters.breakpoint),
    connection: optional(filters.connection),
    device: optional(filters.device),
    analytics_mode: optional(filters.analyticsMode),
  };

  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => value !== undefined)
  ) as UxOverviewPanelCustomState;
};

export const overviewPanelStateToQuery = (state: UxOverviewPanelCustomState) => ({
  serviceName: optional(state.service_name),
  rangeFrom: state.range_from,
  rangeTo: state.range_to,
  kuery: optional(state.kuery),
  browser: optional(state.browser),
  os: optional(state.os),
  location: optional(state.location),
  pageUrl: optional(state.page_url),
  frustration: optional(state.frustration),
  user: optional(state.user),
  includeBots: optional(state.include_bots),
  botUa: optional(state.bot_ua),
  breakpoint: optional(state.breakpoint),
  connection: optional(state.connection),
  device: optional(state.device),
  analyticsMode: optional(state.analytics_mode),
});
