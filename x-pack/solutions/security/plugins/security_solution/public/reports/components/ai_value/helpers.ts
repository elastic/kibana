/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getPercChange = (
  newTime: number | null | undefined,
  compareTime: number | null | undefined
): string | null => {
  if (newTime != null && newTime !== 0 && compareTime != null && compareTime !== 0) {
    return `${(((newTime - compareTime) / compareTime) * 100).toFixed(1)}%`;
  }
  return null;
};
