/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from '@kbn/i18n';
import {
  GRAPH_FLAGS_BADGE_ID,
  GRAPH_FLAGS_PLUS_COUNT_ID,
  GRAPH_FLAGS_TOOLTIP_CONTENT_ID,
  GRAPH_FLAGS_TOOLTIP_COUNTRY_ID,
} from '../../test_ids';
import { CountryFlags, MAX_COUNTRY_FLAGS_IN_TOOLTIP } from './country_flags';

describe('CountryFlags', () => {
  test('render null when input array is empty', () => {
    const { container } = render(<CountryFlags countryCodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders badge with only country flags when below the limit', async () => {
    render(<CountryFlags countryCodes={['US']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸');
    expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
    });
  });

  test('renders badge with only country flags when reaching the limit', async () => {
    render(<CountryFlags countryCodes={['US', 'FR']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸🇫🇷');
    expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    });
  });

  test('renders badge with counter, tooltip and two first country flags when over the visible limit and all are repeated the same amount', async () => {
    render(<CountryFlags countryCodes={['US', 'FR', 'DE', 'JP']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸🇫🇷+2');
    expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID);
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

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
    });

    const tooltipCountries = screen.getAllByTestId(GRAPH_FLAGS_TOOLTIP_COUNTRY_ID);

    expect(countryCodes).toHaveLength(MAX_COUNTRY_FLAGS_IN_TOOLTIP + 1);
    expect(tooltipCountries).toHaveLength(MAX_COUNTRY_FLAGS_IN_TOOLTIP);

    const tooltipContent = screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID);
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
      expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸');
      expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();

      await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_FLAGS_PLUS_COUNT_ID)).not.toBeInTheDocument();
      });
    });

    test('ignores in tooltip', async () => {
      const countryCodes = ['US', 'INVALID', 'FR', 'JP', 'UK']; // United Kingdom's country code is 'GB', not 'UK'
      render(<CountryFlags countryCodes={countryCodes} />);

      await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
      });

      const tooltipContent = screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID);
      expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
        '🇺🇸 United States of America',
        '🇫🇷 France',
        '🇯🇵 Japan',
      ]);
    });
  });

  test('handles uppercase, lowercase, or mixed-case input', async () => {
    render(<CountryFlags countryCodes={['us', 'FR', 'eS']} />);
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)?.textContent).toStrictEqual('🇺🇸🇫🇷+1');
    expect(screen.queryByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      '🇺🇸 United States of America',
      '🇫🇷 France',
      '🇪🇸 Spain',
    ]);
  });

  test('localizes country names based on current locale', async () => {
    const localeSpy = jest.spyOn(i18n, 'getLocale').mockReturnValue('fr');

    render(<CountryFlags countryCodes={['us', 'fr', 'es']} />);

    await userEvent.hover(screen.getByTestId(GRAPH_FLAGS_BADGE_ID));

    await waitFor(() => {
      expect(screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(GRAPH_FLAGS_TOOLTIP_CONTENT_ID);
    expect(Array.from(tooltipContent.children).map((li) => li.textContent)).toStrictEqual([
      "🇺🇸 États-Unis d'Amérique",
      '🇫🇷 France',
      '🇪🇸 Espagne',
    ]);

    localeSpy.mockRestore();
  });
});
