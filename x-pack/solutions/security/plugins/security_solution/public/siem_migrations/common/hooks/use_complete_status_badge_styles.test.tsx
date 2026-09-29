/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useCompleteBadgeStyles } from './use_complete_status_badge_styles';

vi.mock('@elastic/eui', async () => {
  const actual = (await vi.importActual('@elastic/eui'));
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          success: '#000',
          backgroundBaseSuccess: '#111',
          plainDark: '#222',
          textSuccess: '#333',
        },
      },
    }),
  };
});

const mockUseDarkMode = vi.fn(() => false);
vi.mock('@kbn/react-kibana-context-theme', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/react-kibana-context-theme')),
      useKibanaIsDarkMode: () => mockUseDarkMode(),
    };
      return { ...mocked, default: mocked };
    });

describe('useCompleteBadgeStyles', () => {
  it('returns the correct styles for dark mode', () => {
    mockUseDarkMode.mockReturnValue(true);

    const { result } = renderHook(() => useCompleteBadgeStyles());
    expect(result.current.styles).toMatchInlineSnapshot(
      `"background-color:#000;color:#222;text-decoration:none;label:isDarkMode"`
    );
  });

  it('returns the correct styles for light mode', () => {
    mockUseDarkMode.mockReturnValue(false);

    const { result } = renderHook(() => useCompleteBadgeStyles());
    expect(result.current.styles).toMatchInlineSnapshot(
      `"background-color:#111;color:#333;text-decoration:none;label:isDarkMode"`
    );
  });
});
