/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

const WINDOW_BEFORE_CREATION_MS = 28 * 24 * 60 * 60 * 1000;
const WINDOW_AFTER_NOW_MS = 60 * 60 * 1000;

/** The time range `buildPageTimerange` encodes, for a query that must cover the same alerts as the link. */
export const getPageTimerangeBounds = (
  createdAt: string,
  keepOpenForMs = 0
): { from: string; to: string } => {
  const created = new Date(createdAt).getTime();
  return {
    from: new Date(created - WINDOW_BEFORE_CREATION_MS).toISOString(),
    to: new Date(Math.max(Date.now() + WINDOW_AFTER_NOW_MS, created + keepOpenForMs)).toISOString(),
  };
};

/**
 * Rison-encoded global and timeline time range around `createdAt`: 28 days before, up to now. A
 * link to alerts that arrive later passes `keepOpenForMs`, so the range reaches at least that far
 * past `createdAt`.
 */
export const buildPageTimerange = (createdAt: string, keepOpenForMs = 0): string => {
  const { from, to } = getPageTimerangeBounds(createdAt, keepOpenForMs);
  return encode({
    global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
    timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  });
};

// `,` and `:` are the bulk of a rison array of ids and are legal in a query string value.
export const encodePageParam = (value: string): string =>
  encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':');
