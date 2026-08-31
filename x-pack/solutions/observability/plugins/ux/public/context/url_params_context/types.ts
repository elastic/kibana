/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UxLocalUIFilterName } from '../../../common/ux_ui_filter';

export type UrlParams = {
  end?: string;
  environment?: string;
  platform?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
  sortDirection?: string;
  sortField?: string;
  start?: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  percentile?: number;
  exactStart?: string;
  exactEnd?: string;
  frustration?: string;
  pageUrl?: string;
  errorGroup?: string;
  sessionIds?: string;
  user?: string;
  click?: string;
  account?: string;
  sessionQuery?: string;
  includeBots?: string;
  botUa?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  compare?: string;
  includePii?: string;
  goalId?: string;
  includeRaw?: string;
  analyticsMode?: string;
  hasReplay?: string;
  hasBounced?: string;
} & Partial<Record<UxLocalUIFilterName, string>>;

type StringifyAll<T> = { [K in keyof T]: string };
export type UxUrlParams = StringifyAll<UrlParams>;
