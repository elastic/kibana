/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnonymizationSwitch } from './anonymization_switch';
import { useAlertsContext } from '../../../detections/components/alerts_table/alerts_context';

jest.mock('../../../detections/components/alerts_table/alerts_context', () => ({
  useAlertsContext: jest.fn(),
}));

describe('AnonymizationSwitch', () => {
  const mockSetShowAnonymizedValues = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: false,
    });
  });

  it('renders the switch in the unchecked state by default', () => {
    render(<AnonymizationSwitch />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).not.toBeChecked();
  });

  it('calls setShowAnonymizedValues with true when the switch is toggled on', () => {
    render(<AnonymizationSwitch />);

    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(true);
  });

  it('calls setShowAnonymizedValues with false when the switch is toggled off', () => {
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: true,
    });

    render(<AnonymizationSwitch />);

    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(false);
  });

  it('does not render the switch if showAnonymizedValues is undefined', () => {
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: undefined,
    });

    render(<AnonymizationSwitch />);

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
