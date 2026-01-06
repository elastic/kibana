/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { RUN, RUN_TOOLTIP, DISABLED_TOOLTIP } from './translations';
import { Run } from '.';

const defaultProps = {
  isLoading: false,
  onGenerate: jest.fn(),
};

describe('Run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the run button with the expected text', () => {
    render(<Run {...defaultProps} />);

    expect(screen.getByTestId('run')).toHaveTextContent(RUN);
  });

  it('renders the tooltip on hover with the expected text', async () => {
    render(<Run {...defaultProps} />);

    fireEvent.mouseOver(screen.getByTestId('run'));

    await waitFor(() => {
      expect(screen.getByTestId('runTooltip')).toHaveTextContent(RUN_TOOLTIP);
    });
  });

  it('renders the tooltip on hover with the disabled text when isDisabled is true', async () => {
    render(<Run {...defaultProps} isDisabled={true} />);

    fireEvent.mouseOver(screen.getByTestId('run'));

    await waitFor(() => {
      expect(screen.getByTestId('runTooltip')).toHaveTextContent(DISABLED_TOOLTIP);
    });
  });

  it('disables the button when isLoading is true', () => {
    render(<Run {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('run')).toBeDisabled();
  });

  it('calls onGenerate when the button is clicked', () => {
    render(<Run {...defaultProps} />);

    fireEvent.click(screen.getByTestId('run'));

    expect(defaultProps.onGenerate).toHaveBeenCalledTimes(1);
  });
});
