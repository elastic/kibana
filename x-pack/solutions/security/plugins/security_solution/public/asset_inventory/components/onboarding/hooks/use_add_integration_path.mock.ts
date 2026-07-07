/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useAddIntegrationPath } from './use_add_integration_path';

export const mockUseAddIntegrationPath = (
  overrides?: Partial<ReturnType<typeof useAddIntegrationPath>>
) => {
  const defaultMock: Partial<ReturnType<typeof useAddIntegrationPath>> = {
    addIntegrationPath: '/mock-integration-path',
    isLoading: false,
    isError: false,
    error: undefined,
    ...overrides,
  };
  return defaultMock;
};
