/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UxOverviewPanelKind } from './constants';

export type { UxOverviewPanelKind } from './constants';

/** Filters captured from Overview when adding or converting to a dashboard. */
export interface UxOverviewDashboardFilters {
  serviceName?: string;
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  frustration?: string;
  user?: string;
  includeBots?: string;
  botUa?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  analyticsMode?: string;
}

/** By-value embeddable state stored on the dashboard panel. */
export interface UxOverviewPanelCustomState {
  panel: UxOverviewPanelKind;
  service_name: string | undefined;
  range_from: string;
  range_to: string;
  kuery: string | undefined;
  browser: string | undefined;
  os: string | undefined;
  location: string | undefined;
  page_url: string | undefined;
  frustration: string | undefined;
  user: string | undefined;
  include_bots: string | undefined;
  bot_ua: string | undefined;
  breakpoint: string | undefined;
  connection: string | undefined;
  device: string | undefined;
  analytics_mode: string | undefined;
}

export interface UxOverviewPanelEmbeddableState extends UxOverviewPanelCustomState {
  title?: string;
  description?: string;
  hide_title?: boolean;
}
