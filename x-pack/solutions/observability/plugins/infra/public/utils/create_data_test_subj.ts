/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CreateDataTestSubjParams {
  dataTestSubj?: string;
  hasError?: boolean;
  isLoading?: boolean;
}

/**
 * Creates a data-test-subj attribute value based on the component state.
 * Returns a suffixed version for error or loading states, or the provided
 * dataTestSubj value.
 *
 * @param options - Configuration object
 * @param options.dataTestSubj - The base data-test-subj value (optional)
 * @param options.hasError - Whether the component is in an error state (optional)
 * @param options.isLoading - Whether the component is in a loading state (optional)
 * @returns The data-test-subj value to use, or undefined if no value is provided
 */
export function createDataTestSubj(options: CreateDataTestSubjParams): string | undefined {
  const { dataTestSubj, hasError, isLoading } = options;

  if (hasError && dataTestSubj) {
    return `${dataTestSubj}-error`;
  }
  if (isLoading && dataTestSubj) {
    return `${dataTestSubj}-loading`;
  }
  return dataTestSubj;
}
