/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
export const mockHistory = {
  createHref: vi.fn(({ pathname }) => `/enterprise_search${pathname}`),
  push: vi.fn(),
  location: {
    pathname: '/current-path',
  },
};

vi.mock('react-router-dom', () => {
  const mocked = {
    useHistory: vi.fn(() => mockHistory),
  };
  return { ...mocked, default: mocked };
});

/**
 * For example usage, @see public/applications/shared/react_router_helpers/eui_link.test.tsx
 */
