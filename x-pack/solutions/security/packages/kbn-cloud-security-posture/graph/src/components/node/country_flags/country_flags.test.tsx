/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CountryFlags,
  MAX_COUNTRY_FLAGS_IN_TOOLTIP,
  TEST_SUBJ_BADGE,
  TEST_SUBJ_PLUS_COUNT,
  TEST_SUBJ_TOOLTIP_CONTENT,
  TEST_SUBJ_TOOLTIP_COUNTRY,
} from './country_flags';
import { i18n } from '@kbn/i18n';

describe('CountryFlags', () => {
  test('render null when input array is empty', () => {
    const { container } = render(<CountryFlags countryCodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders badge with only country flags when below the limit', async () => {
    render(<CountryFlags countryCodes={['US']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)?.textContent).toStrictEqual('🇺🇸');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
    });
  });

  test('renders badge with only country flags when reaching the limit', async () => {
    render(<CountryFlags countryCodes={['US', 'FR']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)?.textContent).toStrictEqual('🇺🇸🇫🇷');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_SUBJ_PLUS_COUNT)).not.toBeInTheDocument();
    });
  });

  test('renders badge with counter, tooltip and two first country flags when over the visible limit and all are repeated the same amount', async () => {
    render(<CountryFlags countryCodes={['US', 'FR', 'DE', 'JP']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)?.textContent).toStrictEqual('🇺🇸🇫🇷+2');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      '🇺🇸 United States of America',
      '🇫🇷 France',
      '🇩🇪 Germany',
      '🇯🇵 Japan',
    ]);
  });

  test('renders tooltip with max number of countries and copy to open details in flyout', async () => {
    const countryCodes = ['US', 'FR', 'DE', 'JP', 'IL', 'GB', 'CA', 'BR', 'GR', 'IT', 'RU'];
    render(<CountryFlags countryCodes={countryCodes} />);

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipCountries = screen.getAllByTestId(TEST_SUBJ_TOOLTIP_COUNTRY);

    expect(countryCodes).toHaveLength(MAX_COUNTRY_FLAGS_IN_TOOLTIP + 1);
    expect(tooltipCountries).toHaveLength(MAX_COUNTRY_FLAGS_IN_TOOLTIP);

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      '🇺🇸 United States of America',
      '🇫🇷 France',
      '🇩🇪 Germany',
      '🇯🇵 Japan',
      '🇮🇱 Israel',
      '🇬🇧 United Kingdom',
      '🇨🇦 Canada',
      '🇧🇷 Brazil',
      '🇬🇷 Greece',
      '🇮🇹 Italy',
    ]); // Russia is omitted for being over the limit
  });

  test('renders aria-label in focusable button', () => {
    render(<CountryFlags countryCodes={['us', 'fr', 'es']} />);

    const tooltipButton = screen.getByRole('button');
    expect(tooltipButton).toHaveAccessibleName('Show geolocation details');
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
      expect(screen.queryByTestId(TEST_SUBJ_BADGE)?.textContent).toStrictEqual('🇺🇸');
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
        expect(screen.queryByTestId(TEST_SUBJ_PLUS_COUNT)).not.toBeInTheDocument();
      });
    });

    test('ignores in tooltip', async () => {
      const countryCodes = ['US', 'INVALID', 'FR', 'JP', 'UK']; // United Kingdom's country code is 'GB', not 'UK'
      render(<CountryFlags countryCodes={countryCodes} />);

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
      });

      const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
      expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
        '🇺🇸 United States of America',
        '🇫🇷 France',
        '🇯🇵 Japan',
      ]);
    });
  });

  test('handles uppercase, lowercase, or mixed-case input', async () => {
    render(<CountryFlags countryCodes={['us', 'FR', 'eS']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)?.textContent).toStrictEqual('🇺🇸🇫🇷+1');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      '🇺🇸 United States of America',
      '🇫🇷 France',
      '🇪🇸 Spain',
    ]);
  });

  test('localizes country names based on current locale', async () => {
    const localeSpy = jest.spyOn(i18n, 'getLocale').mockReturnValue('fr');

    render(<CountryFlags countryCodes={['us', 'fr', 'es']} />);

    await userEvent.hover(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      "🇺🇸 États-Unis d'Amérique",
      '🇫🇷 France',
      '🇪🇸 Espagne',
    ]);

    localeSpy.mockRestore();
  });
});
