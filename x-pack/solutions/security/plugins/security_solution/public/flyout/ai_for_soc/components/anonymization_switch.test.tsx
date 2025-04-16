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
import { useAIForSOCDetailsContext } from '../context';

jest.mock('../context', () => ({
  useAIForSOCDetailsContext: jest.fn(),
}));

describe('AnonymizationSwitch', () => {
  const mockSetShowAnonymizedValues = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: false,
    });
  });

  it('should render the switch in the unchecked state by default', () => {
    const { getByTestId } = render(<AnonymizationSwitch hasAlertSummary />);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeChecked();
  });

  it('should call setShowAnonymizedValues with true when the switch is toggled on', () => {
    const { getByTestId } = render(<AnonymizationSwitch hasAlertSummary />);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(true);
  });

  it('should call setShowAnonymizedValues with false when the switch is toggled off', () => {
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: true,
    });

    const { getByTestId } = render(<AnonymizationSwitch hasAlertSummary />);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(false);
  });

  it('should not render the switch if showAnonymizedValues is undefined', () => {
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
      showAnonymizedValues: undefined,
    });

    const { queryByTestId } = render(<AnonymizationSwitch hasAlertSummary />);

    expect(queryByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should enable the switch when hasAlertSummary is true', () => {
    const { getByTestId } = render(<AnonymizationSwitch hasAlertSummary={true} />);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeDisabled();
  });

  it('should disable the switch when hasAlertSummary is false', () => {
    const { getByTestId } = render(<AnonymizationSwitch hasAlertSummary={false} />);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).toBeDisabled();
  });
});
