/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { Capabilities } from '@kbn/core/public';
import { RedirectRoute } from './app_routes';
import {
  allCasesCapabilities,
  noCasesCapabilities,
  readCasesCapabilities,
} from '../cases_test_utils';
import { CASES_FEATURE_ID, SECURITY_FEATURE_ID } from '../../common/constants';

const mockNotFoundPage = vi.fn(() => null);
vi.mock('./404', () => {
      const mocked = {
      NotFoundPage: () => mockNotFoundPage(),
    };
      return { ...mocked, default: mocked };
    });

const mockRedirect = vi.fn((_: unknown) => null);
vi.mock('react-router-dom', () => {
      const mocked = {
      Redirect: (params: unknown) => mockRedirect(params),
    };
      return { ...mocked, default: mocked };
    });

describe('RedirectRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are all', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: true, crud: true },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are read', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: readCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to not_found page when siem and case privileges are off', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: noCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNotFoundPage).toHaveBeenCalled();
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is all', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is read', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is read', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: readCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/cases' });
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is all', () => {
    const mockCapabilities = {
      [SECURITY_FEATURE_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/cases' });
  });
});
