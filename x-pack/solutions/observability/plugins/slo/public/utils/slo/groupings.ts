/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function getGroupKeysProse(groupBy: string | string[]) {
  const groups = [groupBy].flat().map((group) => `"${group}"`);
  const groupKeys =
    groups.length > 1
      ? `${groups.slice(0, groups.length - 1).join(', ')} and ${groups.slice(-1)}`
      : groups[0];

  return groupKeys;
}
