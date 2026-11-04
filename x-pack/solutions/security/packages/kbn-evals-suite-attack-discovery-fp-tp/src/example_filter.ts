/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** An empty list keeps every example; an unknown id throws so a typo cannot run an empty dataset. */
export const selectExamplesById = <T extends { id: string }>(
  examples: readonly T[],
  idsEnv: string | undefined
): readonly T[] => {
  const ids = (idsEnv ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return examples;
  }
  const unknown = ids.filter((id) => !examples.some((example) => example.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown FP/TP example id ${unknown.join(', ')}`);
  }
  return examples.filter(({ id }) => ids.includes(id));
};
