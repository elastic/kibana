/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const transformRuleInterval = (
  interval: string | undefined
): [number, string] | undefined => {
  const unitsSet = new Set(['s', 'm', 'h', 'd']);
  const match = interval?.match(/^(\d+)([a-zA-Z]+)$/);

  if (!match || !unitsSet.has(match[2])) {
    return undefined;
  }
  return [parseInt(match[1], 10), match[2]];
};
