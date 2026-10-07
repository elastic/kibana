/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString from 'query-string';

// query-string 9 types array entries as nullable. Callers rely on the 6.x typing, which matches what
// these URLs carry in practice.
export const parseQueryParams = (search: string) =>
  queryString.parse(search, { arrayFormat: 'bracket' }) as Record<string, string | string[] | null>;
