/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

const WINDOW_BEFORE_CREATION_MS = 28 * 24 * 60 * 60 * 1000;
const WINDOW_AFTER_NOW_MS = 60 * 60 * 1000;

/** Rison-encoded global and timeline time range around `createdAt`: 28 days before, up to now. */
export const buildPageTimerange = (createdAt: string): string => {
  const from = new Date(new Date(createdAt).getTime() - WINDOW_BEFORE_CREATION_MS).toISOString();
  const to = new Date(Date.now() + WINDOW_AFTER_NOW_MS).toISOString();
  return encode({
    global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
    timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  });
};

// `,` and `:` are the bulk of a rison array of ids and are legal in a query string value.
export const encodePageParam = (value: string): string =>
  encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':');
