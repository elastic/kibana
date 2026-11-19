/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from '../../constants';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import { BuildDashboardButton } from './build_dashboard_button';
import {
  EVENT_SOURCE,
  GENERATED_PANELS,
  createGeneration,
  createGenerationResult,
  createLinksMock,
} from './test_helpers';

describe('BuildDashboardButton', () => {
  const setup = (generation?: SourceGenerationResult) => {
    const links = createLinksMock();
    render(
      <EuiThemeProvider>
        <BuildDashboardButton
          page="home"
          source={EVENT_SOURCE}
          fill
          links={links}
          generation={generation}
        />
      </EuiThemeProvider>
    );
    fireEvent.click(screen.getByTestId('analyticsHomeBuildSourceDashboard'));

    return links;
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('builds the built-in dashboard, led by the selected use case', () => {
    localStorage.setItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ selectedUseCaseId: 'gaming' })
    );

    const links = setup();

    expect(links.createSourceDashboard).toHaveBeenCalledWith(EVENT_SOURCE, {
      selectedUseCaseId: 'gaming',
      generatedPanels: undefined,
    });
  });

  it('builds the generated dashboard when its panels are ready', () => {
    const links = setup(createGenerationResult({ status: 'ready', data: createGeneration() }));

    expect(links.createSourceDashboard).toHaveBeenCalledWith(EVENT_SOURCE, {
      selectedUseCaseId: undefined,
      generatedPanels: GENERATED_PANELS,
    });
  });

  it.each([
    ['generation is still running', createGenerationResult({ status: 'pending' })],
    ['generation failed', createGenerationResult({ status: 'failed' })],
    [
      'too few generated panels passed validation',
      createGenerationResult({ status: 'ready', data: createGeneration({ panels: null }) }),
    ],
    [
      'the panels were written for another source',
      createGenerationResult({
        status: 'ready',
        data: createGeneration({ source: 'other-events' }),
      }),
    ],
  ])('does not wait and builds the built-in dashboard when %s', (_, generation) => {
    const links = setup(generation);

    expect(links.createSourceDashboard).toHaveBeenCalledWith(EVENT_SOURCE, {
      selectedUseCaseId: undefined,
      generatedPanels: undefined,
    });
  });
});
