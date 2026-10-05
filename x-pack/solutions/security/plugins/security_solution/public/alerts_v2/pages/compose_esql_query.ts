/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Time-range filter expressed in ES|QL via the standard `?_tstart`/`?_tend`
 * named params (filled from the time picker by getESQLResults). Injected right
 * after the source command so it applies before the rest of the user's pipeline.
 */
export const TIME_RANGE_ESQL_FILTER = 'WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';

/**
 * Composes an ES|QL statement from the page's base query (typically what the
 * analyst typed in the search bar) by inserting commands right after the source
 * command and appending commands at the end:
 *
 *   <source> | <injectedAfterSource...> | <rest of base query> | <appended...>
 *
 * Injecting after the source (rather than at the very end) means a filter like
 * the time window applies before a user `LIMIT`, so `LIMIT 10` caps the
 * time-filtered rows rather than an arbitrary slice. Both the debug row-count
 * readout and the KPI charts build on this, so their counts are comparable.
 */
export const composeEsqlQuery = (
  baseEsql: string,
  injectedAfterSource: string[] = [],
  appended: string[] = []
): string => {
  const trimmed = baseEsql.trim();
  const pipeIndex = trimmed.indexOf('|');
  const source = (pipeIndex === -1 ? trimmed : trimmed.slice(0, pipeIndex)).trim();
  const rest = pipeIndex === -1 ? '' : trimmed.slice(pipeIndex + 1).trim();

  return [source, ...injectedAfterSource, ...(rest ? [rest] : []), ...appended].join('\n| ');
};
