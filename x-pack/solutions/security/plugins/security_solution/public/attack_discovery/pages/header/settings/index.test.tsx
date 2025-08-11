/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { SETTINGS, SETTINGS_TOOLTIP } from './translations';
import { Settings } from '.';
import { SETTINGS_TAB_ID } from '../../settings_flyout/constants';

const defaultProps = {
  isLoading: false,
  openFlyout: jest.fn(),
};

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings button with the expected aria-label', () => {
    render(<Settings {...defaultProps} />);

    expect(screen.getByTestId('settings')).toHaveAttribute('aria-label', SETTINGS);
  });

  it('renders the tooltip on hover with the expected text', async () => {
    render(<Settings {...defaultProps} />);

    fireEvent.mouseOver(screen.getByTestId('settings'));

    await waitFor(() => {
      expect(screen.getByTestId('settingsTooltip')).toHaveTextContent(SETTINGS_TOOLTIP);
    });
  });

  it('disables the button when isLoading is true', () => {
    render(<Settings {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('settings')).toBeDisabled();
  });

  it('calls openFlyout with SETTINGS_TAB_ID when the button is clicked', () => {
    render(<Settings {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));

    expect(defaultProps.openFlyout).toHaveBeenCalledWith(SETTINGS_TAB_ID);
  });
});
