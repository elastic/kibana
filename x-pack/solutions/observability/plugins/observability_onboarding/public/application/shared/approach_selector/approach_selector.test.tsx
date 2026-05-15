/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ApproachSelector } from './approach_selector';
import type { ApproachOption } from './types';

const buildOptions = (overrides?: Partial<Pick<ApproachOption, 'onClick'>>): ApproachOption[] => [
  {
    id: 'otel',
    label: 'OpenTelemetry',
    description: 'Use the Elastic Distribution of OpenTelemetry Collector.',
    logo: 'opentelemetry',
    recommended: true,
    href: '/app/observabilityOnboarding/host/linux',
    ...overrides,
  },
  {
    id: 'auto-detect',
    label: 'Elastic Agent',
    description: 'Deploy a standalone Elastic Agent that auto-detects services.',
    logo: 'apple_black',
    href: '/app/observabilityOnboarding/host/linux/auto-detect',
    ...overrides,
  },
];

const options = buildOptions();

const renderSelector = (selectedId: string, opts: ApproachOption[] = options) =>
  render(
    <I18nProvider>
      <ApproachSelector legend="Choose approach" selectedId={selectedId} options={opts} />
    </I18nProvider>
  );

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
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('aria-current')).toBe(
      'page'
    );
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('aria-current')
    ).toBeNull();

    rerender(
      <I18nProvider>
        <ApproachSelector legend="Choose approach" selectedId="auto-detect" options={options} />
      </I18nProvider>
    );
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('aria-current')).toBeNull();
  });

  it('renders each option as a real anchor href so middle-click works', () => {
    renderSelector('otel');
    const eaLink = screen.getByTestId('approachSelectorCard-auto-detect') as HTMLAnchorElement;
    expect(eaLink.tagName).toBe('A');
    expect(eaLink.getAttribute('href')).toBe('/app/observabilityOnboarding/host/linux/auto-detect');
  });

  it('invokes the option onClick on primary click so navigation stays in the SPA', () => {
    const onClick = jest.fn();
    renderSelector('otel', buildOptions({ onClick }));
    fireEvent.click(screen.getByTestId('approachSelectorCard-auto-detect'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('exposes the group with its accessible label', () => {
    renderSelector('otel');
    expect(screen.getByRole('navigation', { name: 'Choose approach' })).toBeInTheDocument();
  });
});
