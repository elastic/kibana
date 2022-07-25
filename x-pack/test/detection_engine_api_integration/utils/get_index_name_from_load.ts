/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getIndexNameFromLoad = (loadResponse: Record<string, unknown>): string => {
  const indexNames = Object.keys(loadResponse);
  if (indexNames.length > 1) {
    throw new Error(
      `expected load response to contain one index, but contained multiple: [${indexNames}]`
    );
  }
  return indexNames[0];
};
