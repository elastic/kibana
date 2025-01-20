/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Page {
  from: number; // current page index, 0-based
  has_more_hits_than_total?: boolean;
  size: number; // size per page
  total: number; // total number of hits
}
export interface Meta {
  page: Page;
}

export interface Paginate<T> {
  _meta: Meta;
  data: T[];
}
