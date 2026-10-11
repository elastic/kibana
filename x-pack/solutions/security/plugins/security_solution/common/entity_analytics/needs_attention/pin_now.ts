/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Replaces every `NOW()` in an ES|QL query with a fixed instant so repeated runs (and the
 * different queries of one snapshot) all see the same "now".
 */
export const pinQueryNow = (query: string, isoNow: string): string =>
  query.split('NOW()').join(`TO_DATETIME("${isoNow}")`);
