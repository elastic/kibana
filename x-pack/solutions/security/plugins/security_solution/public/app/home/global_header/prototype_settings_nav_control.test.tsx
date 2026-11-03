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

describe('PrototypeSettingsNavControl', () => {
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

  it('shows the Empty, Loading and Error states menus', () => {
    renderControl();
    openMenu();
    expect(screen.getByTestId('eaPrototypeSettingsEmptyStates')).toBeInTheDocument();
    expect(screen.getByTestId('eaPrototypeSettingsLoadingStates')).toBeInTheDocument();
    expect(screen.getByTestId('eaPrototypeSettingsErrorStates')).toBeInTheDocument();
    expect(screen.queryByTestId('eaPrototypeSettingsPrototypeVersion')).not.toBeInTheDocument();
  });
});
