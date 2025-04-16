/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import {
  ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID,
  AnonymizationSwitch,
} from './anonymization_switch';
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

  it('should render the switch in the unchecked state by default', () => {
    const { getByTestId } = render(<AnonymizationSwitch />);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeChecked();
  });

  it('should call setShowAnonymizedValues with true when the switch is toggled on', () => {
    const { getByTestId } = render(<AnonymizationSwitch />);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(true);
  });

  it('should call setShowAnonymizedValues with false when the switch is toggled off', () => {
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: true,
    });

    const { getByTestId } = render(<AnonymizationSwitch />);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(false);
  });

  it('should not render the switch if showAnonymizedValues is undefined', () => {
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: undefined,
    });

    const { queryByTestId } = render(<AnonymizationSwitch />);

    expect(queryByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeInTheDocument();
  });
});
