/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GRAPH_FLAGS_BADGE_ID,
  GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID,
  GRAPH_FLAGS_PLUS_COUNT_ID,
  GRAPH_FLAGS_POPOVER_CONTENT_ID,
} from '../../test_ids';
import { CountryFlags, useCountryFlagsPopover } from './country_flags';

describe('CountryFlags', () => {
  const mockOnCountryClick = jest.fn();

  beforeEach(() => {
    mockOnCountryClick.mockClear();
  });

  test('render null when input array is empty', () => {
    const { container } = render(<CountryFlags countryCodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders badge with country flags without counter when below the limit', async () => {
    render(<CountryFlags countryCodes={['US']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸');
    expect(screen.queryByTestId(GRAPH_FLAGS_POPOVER_CONTENT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders badge with country flags without counter when reaching the limit', async () => {
    render(<CountryFlags countryCodes={['US', 'FR']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸🇫🇷');
    expect(screen.queryByTestId(GRAPH_FLAGS_POPOVER_CONTENT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders badge with clickable counter when over the visible limit of country flags with onCountryClick callback', async () => {
    render(
      <CountryFlags countryCodes={['US', 'FR', 'DE', 'JP']} onCountryClick={mockOnCountryClick} />
    );
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸🇫🇷+2');
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID));

    expect(mockOnCountryClick).toHaveBeenCalledTimes(1);
  });

  test('renders badge with non clickable counter when over the visible limit of country flags without onCountryClick callback', async () => {
    const testCountryCodes = ['US', 'FR', 'DE', 'JP'];
    render(<CountryFlags countryCodes={testCountryCodes} />);

    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();

    expect(mockOnCountryClick).toHaveBeenCalledTimes(0);
  });

  test('renders aria-label in focusable button', () => {
    render(<CountryFlags countryCodes={['us', 'fr', 'es']} onCountryClick={mockOnCountryClick} />);

    const counterButton = screen.getByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID);
    expect(counterButton).toHaveAccessibleName('Country flags popover');
  });

  describe('ignores invalid country codes', () => {
    test('renders null if all country codes are invalid', async () => {
      const { container } = render(
        <CountryFlags
          countryCodes={[
            'INVALID',
            'X',
            '',
            [] as unknown as string,
            {} as unknown as string,
            0 as unknown as string,
            null as unknown as string,
            undefined as unknown as string,
          ]}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('ignores in badge', async () => {
      render(
        <CountryFlags
          countryCodes={[
            'US', // only this country code is valid so we only show 🇺🇸
            'INVALID',
            'X',
            '',
            [] as unknown as string,
            {} as unknown as string,
            0 as unknown as string,
            null as unknown as string,
            undefined as unknown as string,
          ]}
        />
      );
      expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸');

      await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
      });
    });
  });
});

describe('useCountryFlagsPopover', () => {
  test('filters invalid country codes and transforms valid ones correctly', () => {
    const countryCodes = ['US', 'INVALID', 'FR', '', 'DE', null as unknown as string];
    const { result } = renderHook(() => useCountryFlagsPopover(countryCodes));

    // Should have filtered out invalid codes and transformed valid ones
    expect(result.current.id).toBe('country-flags-popover');
    expect(result.current.onCountryClick).toBeInstanceOf(Function);
    expect(result.current.PopoverComponent).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.state).toBeDefined();
  });

  test('handles empty array', () => {
    const { result } = renderHook(() => useCountryFlagsPopover([]));

    expect(result.current.id).toBe('country-flags-popover');
    expect(result.current.onCountryClick).toBeInstanceOf(Function);
  });

  test('returns correct interface structure', () => {
    const countryCodes = ['US', 'FR'];
    const { result } = renderHook(() => useCountryFlagsPopover(countryCodes));

    // Check that it has all required properties from UseCountryFlagsPopoverReturn
    expect(result.current).toHaveProperty('id');
    expect(result.current).toHaveProperty('onCountryClick');
    expect(result.current).toHaveProperty('PopoverComponent');
    expect(result.current).toHaveProperty('actions');
    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('onClick');

    // Verify onCountryClick is the same as onClick (the hook alias)
    expect(result.current.onCountryClick).toBe(result.current.onClick);
  });
});
