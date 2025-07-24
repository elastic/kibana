/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CountryFlags } from './country_flags';
import { i18n } from '@kbn/i18n';

const TEST_SUBJ_BADGE = 'country-flags-badge';
const TEST_SUBJ_TOOLTIP = 'country-flags-tooltip';
const TEST_SUBJ_TOOLTIP_CONTENT = 'country-flags-tooltip-content';
const TEST_SUBJ_PLUS_COUNT = 'country-flags-plus-count';

describe('CountryFlags', () => {
  test('renders empty badge when input is unexpectedly undefined', () => {
    const { container } = render(<CountryFlags countryCodes={undefined as unknown as string[]} />);
    expect(container.firstChild).toHaveTextContent('');
  });

  test('renders empty badge when input array is empty', () => {
    const { container } = render(<CountryFlags countryCodes={[]} />);
    expect(container.firstChild).toHaveTextContent('');
  });

  test('renders badge with only country flags when below the limit', async () => {
    render(<CountryFlags countryCodes={['US']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)).toHaveTextContent('🇺🇸');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
    });
  });

  test('renders badge with only country flags when reaching the limit', async () => {
    render(<CountryFlags countryCodes={['US', 'FR']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)).toHaveTextContent('🇺🇸🇫🇷');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_SUBJ_PLUS_COUNT)).not.toBeInTheDocument();
    });
  });

  test('renders badge with counter, tooltip and two first country flags when over the limit and all repeated the same amount', async () => {
    render(<CountryFlags countryCodes={['US', 'FR', 'DE', 'JP']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)).toHaveTextContent('🇺🇸🇫🇷');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(tooltipContent).toHaveTextContent('🇺🇸 United States of America');
    expect(tooltipContent).toHaveTextContent('🇫🇷 France');
    expect(tooltipContent).toHaveTextContent('🇩🇪 Germany');
    expect(tooltipContent).toHaveTextContent('🇯🇵 Japan');

    expect(screen.getByTestId(TEST_SUBJ_PLUS_COUNT)).toHaveTextContent('+2');
  });

  test('renders tooltip with correct title', async () => {
    render(<CountryFlags countryCodes={['us', 'fr', 'es']} />);

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP);
    expect(tooltipContent).toHaveTextContent('Geolocation');
  });

  test('ignores invalid country codes', async () => {
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
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)).toHaveTextContent('🇺🇸');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_SUBJ_PLUS_COUNT)).not.toBeInTheDocument();
    });
  });

  test('handles uppercase, lowercase, or mixed-case input', async () => {
    render(<CountryFlags countryCodes={['us', 'FR', 'eS']} />);
    expect(screen.queryByTestId(TEST_SUBJ_BADGE)).toHaveTextContent('🇺🇸🇫🇷');
    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(tooltipContent).toHaveTextContent('🇺🇸 United States of America');
    expect(tooltipContent).toHaveTextContent('🇫🇷 France');
    expect(tooltipContent).toHaveTextContent('🇪🇸 Spain');

    expect(screen.getByTestId(TEST_SUBJ_PLUS_COUNT)).toHaveTextContent('+1');
  });

  test('localizes country names based on current locale', async () => {
    const localeSpy = jest.spyOn(i18n, 'getLocale').mockReturnValue('fr');

    render(<CountryFlags countryCodes={['us', 'fr', 'es']} />);

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_BADGE));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT);
    expect(tooltipContent).toHaveTextContent('🇺🇸 États-Unis');
    expect(tooltipContent).toHaveTextContent('🇫🇷 France');
    expect(tooltipContent).toHaveTextContent('🇪🇸 Espagne');

    localeSpy.mockRestore();
  });
});