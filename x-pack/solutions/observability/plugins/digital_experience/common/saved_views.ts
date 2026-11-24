/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewPercentileParam } from './overview_filters';

/** The saved object type of a view: a named set of the Overview's filters, query and percentile. */
export const SAVED_VIEW_TYPE = 'digital-experience-view';

export const SAVED_VIEW_NAME_MAX_LENGTH = 256;
export const SAVED_VIEW_DESCRIPTION_MAX_LENGTH = 1024;
/** The longest `rangeFrom` or `rangeTo`: an ISO date or date math such as `now-15m`. */
export const SAVED_VIEW_RANGE_MAX_LENGTH = 128;

/** The most views a space holds. The list is read whole, so it is bounded. */
export const SAVED_VIEWS_MAX = 100;

/**
 * What a view keeps of the Overview: its filters (the `filters` param, see
 * `overview_filters_param.ts`), KQL query and load time percentile, and the time range when the
 * person asked for it to be kept. A view belongs to the space, not to an application.
 */
export interface SavedViewAttributes {
  name: string;
  description?: string;
  filters?: string;
  kuery?: string;
  percentile?: OverviewPercentileParam;
  /** Both or neither: a view keeps a whole time range or none. */
  rangeFrom?: string;
  rangeTo?: string;
}

export interface SavedView extends SavedViewAttributes {
  id: string;
  /** ISO date of the last save, from the saved object. */
  updatedAt?: string;
}

export interface SavedViewsResponse {
  views: SavedView[];
}

export interface DeletedSavedViewResponse {
  id: string;
}
