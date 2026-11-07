/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UseCaseStatus = 'loading' | 'unavailable' | 'active' | 'not_configured';

/** Missing or failed evidence cannot establish whether a use case is configured. */
export const getUseCaseStatus = ({
  isLoading,
  isError,
  isActive,
}: {
  isLoading: boolean;
  isError?: boolean;
  isActive: boolean | undefined;
}): UseCaseStatus => {
  if (isLoading) return 'loading';
  if (isError || isActive === undefined) return 'unavailable';
  return isActive ? 'active' : 'not_configured';
};
