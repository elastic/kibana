/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { PrototypeSettingsNavControl } from './prototype_settings_nav_control';
import {
  setActiveFaceliftVersion,
  getActiveFaceliftVersion,
} from '../../../entity_analytics/components/home/facelift/active_version';
import { setSimplifiedMetrics } from '../../../entity_analytics/components/home/facelift/v8/active_metrics_version';

describe('PrototypeSettingsNavControl', () => {
  beforeEach(() => {
    setActiveFaceliftVersion('v8');
    setSimplifiedMetrics(false);
  });

  const renderControl = () =>
    render(
      <TestProviders>
        <PrototypeSettingsNavControl />
      </TestProviders>
    );

  const openMenu = () => {
    fireEvent.click(screen.getByTestId('eaPrototypeSettingsButton'));
  };

  it('renders an empty palette button labelled Prototype settings', () => {
    renderControl();
    const button = screen.getByTestId('eaPrototypeSettingsButton');
    expect(button).toHaveAttribute('aria-label', 'Prototype settings');
    expect(button).toHaveTextContent('');
  });

  it('shows Prototype version, Metrics version, and the switcher on v.8', () => {
    renderControl();
    openMenu();
    expect(screen.getByTestId('eaPrototypeSettingsPrototypeVersion')).toBeInTheDocument();
    expect(screen.getByTestId('eaPrototypeSettingsMetricsVersion')).toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSimplifiedMetricsSwitch')).toBeInTheDocument();
  });

  it('hides the switcher on v.6 and keeps Metrics version', () => {
    setActiveFaceliftVersion('v6');
    renderControl();
    openMenu();
    expect(screen.getByTestId('eaPrototypeSettingsPrototypeVersion')).toBeInTheDocument();
    expect(screen.getByTestId('eaPrototypeSettingsMetricsVersion')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSimplifiedMetricsSwitch')).not.toBeInTheDocument();
  });

  it('hides Metrics version and the switcher on v.5', () => {
    setActiveFaceliftVersion('v5');
    renderControl();
    openMenu();
    expect(screen.getByTestId('eaPrototypeSettingsPrototypeVersion')).toBeInTheDocument();
    expect(screen.queryByTestId('eaPrototypeSettingsMetricsVersion')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSimplifiedMetricsSwitch')).not.toBeInTheDocument();
  });

  it('changes the prototype version from the nested panel', async () => {
    renderControl();
    openMenu();
    fireEvent.click(screen.getByTestId('eaPrototypeSettingsPrototypeVersion'));
    const option = await screen.findByTestId('eaPrototypeSettingsPrototypeOption-v5');
    fireEvent.click(option);
    expect(getActiveFaceliftVersion()).toBe('v5');
  });

  it('toggles Simplified metrics from the v.8 menu item', () => {
    renderControl();
    openMenu();
    fireEvent.click(screen.getByTestId('eaPrototypeSettingsSimplifiedMetrics'));
    expect(screen.getByTestId('eaFaceliftSimplifiedMetricsSwitch')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
