/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { Actions } from '.';

const defaultProps = {
  isLoading: false,
  onGenerate: jest.fn(),
  openFlyout: jest.fn(),
};

describe('Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering action buttons', () => {
    beforeEach(() => {
      render(<Actions {...defaultProps} />);
    });

    it('renders the Run button', () => {
      expect(screen.getByTestId('run')).toBeInTheDocument();
    });

    it('renders the settings button', () => {
      expect(screen.getByTestId('settings')).toBeInTheDocument();
    });

    it('renders the schedule button', () => {
      expect(screen.getByTestId('schedule')).toBeInTheDocument();
    });
  });

  describe('disables buttons when isLoading is true', () => {
    beforeEach(() => {
      render(<Actions {...defaultProps} isLoading={true} />);
    });

    it('disables the run button', () => {
      expect(screen.getByTestId('run')).toBeDisabled();
    });

    it('disables the settings button', () => {
      expect(screen.getByTestId('settings')).toBeDisabled();
    });

    it('disables the schedule button', () => {
      expect(screen.getByTestId('schedule')).toBeDisabled();
    });
  });

  it('calls onGenerate when the run button is clicked', () => {
    render(<Actions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('run'));

    expect(defaultProps.onGenerate).toHaveBeenCalledTimes(1);
  });

  it('calls openFlyout with "settings" when settings button is clicked', () => {
    render(<Actions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));

    expect(defaultProps.openFlyout).toHaveBeenCalledWith('settings');
  });

  it('calls openFlyout with "schedule" when schedule button is clicked', () => {
    render(<Actions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('schedule'));

    expect(defaultProps.openFlyout).toHaveBeenCalledWith('schedule');
  });
});
