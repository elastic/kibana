/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PndBrowserConfig } from '../../hooks/use_pnd_client_config';
import { PndClientConfigProvider } from '../../hooks/use_pnd_client_config';
import { DemoModeBadge } from '.';

const renderWithConfig = (config: PndBrowserConfig) =>
  render(
    <PndClientConfigProvider config={config}>
      <DemoModeBadge />
    </PndClientConfigProvider>
  );

const baseConfig: PndBrowserConfig = {
  enabled: true,
  ui: { useMockData: false },
};

describe('DemoModeBadge', () => {
  it('renders the badge when demo mode forces every investigation to an incident', () => {
    renderWithConfig({ ...baseConfig, demo: { forceIncident: true } });

    expect(screen.getByTestId('pndDemoModeBadge')).toBeInTheDocument();
  });

  it('labels the badge so a staged run is never mistaken for a real verdict', () => {
    renderWithConfig({ ...baseConfig, demo: { forceIncident: true } });

    expect(screen.getByText('Demo mode')).toBeInTheDocument();
  });

  it('renders nothing when demo mode is off', () => {
    renderWithConfig({ ...baseConfig, demo: { forceIncident: false } });

    expect(screen.queryByTestId('pndDemoModeBadge')).not.toBeInTheDocument();
  });

  it('renders nothing when the demo block is absent', () => {
    renderWithConfig(baseConfig);

    expect(screen.queryByTestId('pndDemoModeBadge')).not.toBeInTheDocument();
  });

  it('renders nothing without a config provider', () => {
    render(<DemoModeBadge />);

    expect(screen.queryByTestId('pndDemoModeBadge')).not.toBeInTheDocument();
  });
});
