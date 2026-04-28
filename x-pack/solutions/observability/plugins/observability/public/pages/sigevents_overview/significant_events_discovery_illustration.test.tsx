/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { SignificantEventsDiscoveryIllustration } from './significant_events_discovery_illustration';

const LIGHT_IMAGE_PATH = '/mock/light.svg';
const DARK_IMAGE_PATH = '/mock/dark.svg';

jest.mock('../../assets/significant_events_discovery_light.svg', () => LIGHT_IMAGE_PATH, {
  virtual: true,
});

jest.mock('../../assets/significant_events_discovery_dark.svg', () => DARK_IMAGE_PATH, {
  virtual: true,
});

async function renderWithTheme(colorMode: 'light' | 'dark') {
  const result = render(
    <EuiThemeProvider colorMode={colorMode}>
      <SignificantEventsDiscoveryIllustration />
    </EuiThemeProvider>
  );
  await waitFor(() => {
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
  return result;
}

describe('SignificantEventsDiscoveryIllustration', () => {
  it('renders light mode image when colorMode is light', async () => {
    await renderWithTheme('light');

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', LIGHT_IMAGE_PATH);
    expect(img).toHaveAttribute('alt', 'Illustration for Significant Events discovery');
  });

  it('renders dark mode image when colorMode is dark', async () => {
    await renderWithTheme('dark');

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', DARK_IMAGE_PATH);
  });

  it('updates image when colorMode changes', async () => {
    const result = await renderWithTheme('light');

    expect(screen.getByRole('img')).toHaveAttribute('src', LIGHT_IMAGE_PATH);

    result.rerender(
      <EuiThemeProvider colorMode="dark">
        <SignificantEventsDiscoveryIllustration />
      </EuiThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', DARK_IMAGE_PATH);
    });
  });

  it('does not update state after unmount', async () => {
    const result = render(
      <EuiThemeProvider colorMode="light">
        <SignificantEventsDiscoveryIllustration />
      </EuiThemeProvider>
    );

    result.unmount();

    await waitFor(() => Promise.resolve());
  });
});
