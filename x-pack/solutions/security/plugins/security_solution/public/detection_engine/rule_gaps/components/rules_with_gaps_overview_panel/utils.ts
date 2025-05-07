/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getExecutionSuccessRate = (
  summary: { success: number; total: number } | undefined
) => {
  if (!summary || summary.total === 0) {
    return 0;
  }

  const rate = (100 * summary.success) / summary.total;

  return Number(rate % 1 === 0 ? rate.toString() : rate.toFixed(2));
};
