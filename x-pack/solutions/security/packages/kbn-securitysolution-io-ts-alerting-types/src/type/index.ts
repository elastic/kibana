/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const type = t.keyof({
  eql: null,
  machine_learning: null,
  query: null,
  saved_query: null,
  threshold: null,
  threat_match: null,
  new_terms: null,
  esql: null,
});
export type Type = t.TypeOf<typeof type>;

export const typeOrUndefined = t.union([type, t.undefined]);
export type TypeOrUndefined = t.TypeOf<typeof typeOrUndefined>;
