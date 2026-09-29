/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistory, mockLocation } from './state.mock';

import { vi } from 'vitest';

export const mockUseHistory = vi.fn(() => mockHistory);
export const mockUseLocation = vi.fn(() => mockLocation);
export const mockUseParams = vi.fn(() => ({}));
export const mockUseRouteMatch = vi.fn(() => true);

vi.mock('react-router-dom', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...originalModule,
    useHistory: mockUseHistory,
    useLocation: mockUseLocation,
    useParams: mockUseParams,
    useRouteMatch: mockUseRouteMatch,
    // Note: RR's generatePath() opinionatedly encodeURI()s paths (although this doesn't actually
    // show up/affect the final browser URL). Since we already have a generateEncodedPath helper &
    // RR is removing this behavior in history 5.0+, I'm mocking tests to remove the extra encoding
    // for now to make reading generateEncodedPath URLs a little less of a pain
    generatePath: vi.fn((path, params) => decodeURI(originalModule.generatePath(path, params))),
  };
});
