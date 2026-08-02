/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { PndClientConfigProvider, type PndBrowserConfig } from '../../hooks/use_pnd_client_config';
import { renderWithPndProviders } from '../../test_helpers/render_with_providers';
import { SettingsPage } from '.';
import {
  SETTING_ATTACK_DISCOVERY_WORKFLOWS,
  SETTING_DEMO_FORCE_INCIDENT,
  SETTING_PND_ENABLED,
  SETTING_USE_MOCK_DATA,
} from './translations';

const baseConfig: PndBrowserConfig = { enabled: true, ui: { useMockData: false } };

const renderSettings = (config: PndBrowserConfig = baseConfig) =>
  renderWithPndProviders(
    <PndClientConfigProvider config={config}>
      <SettingsPage />
    </PndClientConfigProvider>
  );

describe('SettingsPage', () => {
  it.each([
    SETTING_PND_ENABLED,
    SETTING_ATTACK_DISCOVERY_WORKFLOWS,
    SETTING_DEMO_FORCE_INCIDENT,
    SETTING_USE_MOCK_DATA,
  ])('documents the %s switch', (settingKey) => {
    renderSettings();

    expect(screen.getByText(settingKey)).toBeInTheDocument();
  });

  it('reports demo mode as on when the browser-exposed switch is on', () => {
    renderSettings({ ...baseConfig, demo: { forceIncident: true } });

    expect(screen.getByTestId(`pndSettingValue-${SETTING_DEMO_FORCE_INCIDENT}`)).toHaveTextContent(
      'On'
    );
  });

  it('reports demo mode as off by default, which is the non-demo default', () => {
    renderSettings();

    expect(screen.getByTestId(`pndSettingValue-${SETTING_DEMO_FORCE_INCIDENT}`)).toHaveTextContent(
      'Off'
    );
  });

  it('reports the mock-data flag as on when the browser-exposed config says so', () => {
    renderSettings({ ...baseConfig, ui: { useMockData: true } });

    expect(screen.getByTestId(`pndSettingValue-${SETTING_USE_MOCK_DATA}`)).toHaveTextContent('On');
  });

  it('reports the mock-data flag as off when the browser-exposed config says so', () => {
    renderSettings();

    expect(screen.getByTestId(`pndSettingValue-${SETTING_USE_MOCK_DATA}`)).toHaveTextContent('Off');
  });

  it('does not claim to know the per-space Attack Discovery setting, which the browser cannot read', () => {
    renderSettings();

    expect(
      screen.getByTestId(`pndSettingValue-${SETTING_ATTACK_DISCOVERY_WORKFLOWS}`)
    ).toHaveTextContent('Per space');
  });

  it('says what the mock-data flag no longer does, now that every other view reads live data', () => {
    renderSettings();

    expect(screen.getByTestId('pndSettingsMockDataScopeNote')).toBeInTheDocument();
  });
});
