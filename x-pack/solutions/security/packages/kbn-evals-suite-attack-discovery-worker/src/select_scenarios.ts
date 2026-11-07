/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Narrows `rows` to the comma-separated ids in `only` (the `AD_WORKER_EVAL_SCENARIOS` value),
 * keeping the rows' own order; an empty value selects every row. An unknown id throws naming it and
 * the valid ids: a typo that silently dropped one id would score a different set than the one asked
 * for.
 */
export const selectScenarios = <Row extends { id?: string | number }>({
  rows,
  only,
  envName,
}: {
  rows: readonly Row[];
  only: string | undefined;
  envName: string;
}): Row[] => {
  const wanted = (only ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (wanted.length === 0) return [...rows];
  const known = new Set(rows.flatMap(({ id }) => (id === undefined ? [] : [String(id)])));
  const unknown = wanted.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `${envName}=${wanted.join(',')} names unknown scenario${
        unknown.length > 1 ? 's' : ''
      } ${unknown.map((id) => `"${id}"`).join(', ')}; valid ids: ${[...known].join(', ')}.`
    );
  }
  return rows.filter(({ id }) => id !== undefined && wanted.includes(String(id)));
};
