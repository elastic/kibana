/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { CollectionMethodSelector } from './collection_method_selector';
import type { CollectionMethodOption } from './types';

const buildOptions = (): CollectionMethodOption[] => [
  {
    id: 'otel',
    label: 'OpenTelemetry',
    description: 'Use the Elastic Distribution of OpenTelemetry Collector.',
    logo: 'opentelemetry',
    recommended: true,
    navigateTo: '/host/linux',
  },
  {
    id: 'auto-detect',
    label: 'Elastic Agent',
    description: 'Deploy a standalone Elastic Agent that auto-detects services.',
    euiIconType: 'agentApp',
    navigateTo: '/host/linux/auto-detect',
  },
];

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div
      data-test-subj="locationProbe"
      data-pathname={location.pathname}
      data-search={location.search}
    />
  );
};

const renderSelector = (
  selectedId: string,
  initialEntries: string[] = ['/host/linux'],
  options: CollectionMethodOption[] = buildOptions()
) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <CompatRouter>
          <CollectionMethodSelector
            legend="Choose collection method"
            selectedId={selectedId}
            options={options}
          />
          <LocationProbe />
        </CompatRouter>
      </MemoryRouter>
    </I18nProvider>
  );

const getLocation = () => {
  const probe = screen.getByTestId('locationProbe');
  return {
    pathname: probe.getAttribute('data-pathname'),
    search: probe.getAttribute('data-search'),
  };
};

describe('CollectionMethodSelector', () => {
  it('renders one card per option with the labels visible', () => {
    renderSelector('otel');
    expect(screen.getByText('OpenTelemetry')).toBeInTheDocument();
    expect(screen.getByText('Elastic Agent')).toBeInTheDocument();
  });

  it('marks the recommended option with a recommended badge', () => {
    renderSelector('otel');
    expect(screen.getByTestId('collectionMethodSelectorRecommendedBadge-otel')).toBeInTheDocument();
    expect(screen.queryByTestId('collectionMethodSelectorRecommendedBadge-auto-detect')).toBeNull();
  });

  it('reflects the selected option from the prop (not internal state)', () => {
    const { rerender } = renderSelector('otel');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('false');

    rerender(
      <I18nProvider>
        <MemoryRouter initialEntries={['/host/linux']}>
          <CompatRouter>
            <CollectionMethodSelector
              legend="Choose collection method"
              selectedId="auto-detect"
              options={buildOptions()}
            />
            <LocationProbe />
          </CompatRouter>
        </MemoryRouter>
      </I18nProvider>
    );
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('false');
  });

  it('navigates to the option path when selecting an unselected card', () => {
    renderSelector('otel');
    fireEvent.click(screen.getByRole('radio', { name: /Elastic Agent/ }));
    expect(getLocation().pathname).toBe('/host/linux/auto-detect');
  });

  it('does not navigate when re-selecting the already selected card', () => {
    renderSelector('otel');
    fireEvent.click(screen.getByRole('radio', { name: /OpenTelemetry/ }));
    expect(getLocation().pathname).toBe('/host/linux');
  });

  it('exposes the group with its accessible label', () => {
    renderSelector('otel');
    expect(screen.getByRole('group', { name: 'Choose collection method' })).toBeInTheDocument();
  });
});
