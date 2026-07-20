/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { pathQuery, useReturnPath, useWizardPath } from './use_wizard_path';
import { ONBOARDING_PATH, TUTORIALS_PATH } from '../routes';

const wrapperFor =
  (initialEntries: MemoryRouterProps['initialEntries']) =>
  ({ children }: { children: React.ReactNode }) =>
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;

describe('useReturnPath', () => {
  it('returns the onboarding path when the origin is the onboarding path', () => {
    const { result } = renderHook(() => useReturnPath(), {
      wrapper: wrapperFor([
        { pathname: `${ONBOARDING_PATH}/ingest`, state: { origin: ONBOARDING_PATH } },
      ]),
    });
    expect(result.current).toBe(ONBOARDING_PATH);
  });

  it('returns the tutorials path when the origin is the tutorials path', () => {
    const { result } = renderHook(() => useReturnPath(), {
      wrapper: wrapperFor([
        { pathname: `${ONBOARDING_PATH}/ingest`, state: { origin: TUTORIALS_PATH } },
      ]),
    });
    expect(result.current).toBe(TUTORIALS_PATH);
  });

  it('defaults to the tutorials path when no origin is present in the location state', () => {
    const { result } = renderHook(() => useReturnPath(), {
      wrapper: wrapperFor([{ pathname: `${ONBOARDING_PATH}/ingest` }]),
    });
    expect(result.current).toBe(TUTORIALS_PATH);
  });

  it('defaults to the tutorials path when the origin is unrecognized', () => {
    const { result } = renderHook(() => useReturnPath(), {
      wrapper: wrapperFor([
        { pathname: `${ONBOARDING_PATH}/ingest`, state: { origin: '/somewhere-else' } },
      ]),
    });
    expect(result.current).toBe(TUTORIALS_PATH);
  });
});

describe('useWizardPath', () => {
  it('returns the path from a valid "path" query parameter', () => {
    const { result } = renderHook(() => useWizardPath(), {
      wrapper: wrapperFor([
        { pathname: `${ONBOARDING_PATH}/ingest`, search: '?path=have-vectors' },
      ]),
    });
    expect(result.current).toBe('have-vectors');
  });

  it('returns null when the "path" query parameter is not a valid vector path', () => {
    const { result } = renderHook(() => useWizardPath(), {
      wrapper: wrapperFor([{ pathname: `${ONBOARDING_PATH}/ingest`, search: '?path=nonsense' }]),
    });
    expect(result.current).toBeNull();
  });

  it('returns null when there is no "path" query parameter', () => {
    const { result } = renderHook(() => useWizardPath(), {
      wrapper: wrapperFor([{ pathname: `${ONBOARDING_PATH}/ingest` }]),
    });
    expect(result.current).toBeNull();
  });
});

describe('pathQuery', () => {
  it('builds a query string from the vector path', () => {
    expect(pathQuery('have-vectors')).toBe('?path=have-vectors');
    expect(pathQuery('generate-vectors')).toBe('?path=generate-vectors');
  });
});
