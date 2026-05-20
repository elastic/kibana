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
import { ApproachSelector } from './approach_selector';
import type { ApproachOption } from './types';

const buildOptions = (): ApproachOption[] => [
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
  options: ApproachOption[] = buildOptions()
) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <CompatRouter>
          <ApproachSelector legend="Choose approach" selectedId={selectedId} options={options} />
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

describe('ApproachSelector', () => {
  it('renders one card per option with the labels visible', () => {
    renderSelector('otel');
    expect(screen.getByText('OpenTelemetry')).toBeInTheDocument();
    expect(screen.getByText('Elastic Agent')).toBeInTheDocument();
  });

  it('marks the recommended option with a recommended badge', () => {
    renderSelector('otel');
    expect(screen.getByTestId('approachSelectorRecommendedBadge-otel')).toBeInTheDocument();
    expect(screen.queryByTestId('approachSelectorRecommendedBadge-auto-detect')).toBeNull();
  });

  it('reflects the selected option from the prop (not internal state)', () => {
    const { rerender } = renderSelector('otel');
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('data-selected')).toBe(
      'true'
    );
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('false');

    rerender(
      <I18nProvider>
        <MemoryRouter initialEntries={['/host/linux']}>
          <CompatRouter>
            <ApproachSelector
              legend="Choose approach"
              selectedId="auto-detect"
              options={buildOptions()}
            />
            <LocationProbe />
          </CompatRouter>
        </MemoryRouter>
      </I18nProvider>
    );
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('data-selected')).toBe(
      'false'
    );
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
    expect(screen.getByRole('group', { name: 'Choose approach' })).toBeInTheDocument();
  });
});
