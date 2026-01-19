/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFillColor = (
  incompatible: number | undefined,
  successColor: string,
  dangerColor: string,
  primaryColor: string
): string => {
  if (incompatible === 0) {
    return successColor;
  } else if (incompatible != null && incompatible > 0) {
    return dangerColor;
  } else {
    return primaryColor;
  }
};
