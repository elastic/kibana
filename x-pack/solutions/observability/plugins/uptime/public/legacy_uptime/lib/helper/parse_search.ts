/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';

export function getParsedParams(search: string) {
  return search ? parse(search[0] === '?' ? search.slice(1) : search, { sort: false }) : {};
}
