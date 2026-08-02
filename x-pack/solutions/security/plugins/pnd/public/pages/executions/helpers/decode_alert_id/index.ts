/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Attack Discovery alert id from the route, decoded.
 *
 * react-router v5 hands back the raw path segment, and callers encode the id when they build the
 * route (the overlay's "Open full page" does), so a discovery id containing a space or a slash would
 * otherwise reach the API percent-encoded twice and 404. A value that is not valid percent-encoding
 * is used as-is rather than throwing: an id is a value to look up, not something worth taking the page
 * down over.
 */
export const decodeAlertId = (correlationId: string | undefined): string | undefined => {
  if (!correlationId) {
    return undefined;
  }

  try {
    return decodeURIComponent(correlationId);
  } catch {
    return correlationId;
  }
};
