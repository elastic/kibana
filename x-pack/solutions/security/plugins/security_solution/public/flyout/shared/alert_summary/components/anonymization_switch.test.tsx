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

const renderAnonymizedSwitch = ({
  hasAlertSummary,
  showAnonymizedValues,
  setShowAnonymizedValues,
}: {
  hasAlertSummary: boolean;
  showAnonymizedValues: boolean | undefined;
  setShowAnonymizedValues: jest.Mock;
}) =>
  render(
    <AnonymizationSwitch
      hasAlertSummary={hasAlertSummary}
      showAnonymizedValues={showAnonymizedValues}
      setShowAnonymizedValues={setShowAnonymizedValues}
    />
  );

describe('AnonymizationSwitch', () => {
  let mockSetShowAnonymizedValues: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetShowAnonymizedValues = jest.fn();
  });

  it('should render the switch in the unchecked state by default', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: true,
      showAnonymizedValues: false,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeChecked();
  });

  it('should call setShowAnonymizedValues with true when the switch is toggled on', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: true,
      showAnonymizedValues: false,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(true);
  });

  it('should call setShowAnonymizedValues with false when the switch is toggled off', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: true,
      showAnonymizedValues: true,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(false);
  });

  it('should not render the switch if showAnonymizedValues is undefined', () => {
    const { queryByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: true,
      showAnonymizedValues: undefined,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    expect(queryByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should enable the switch when hasAlertSummary is true', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: true,
      showAnonymizedValues: false,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeDisabled();
  });

  it('should disable the switch when hasAlertSummary is false', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasAlertSummary: false,
      showAnonymizedValues: false,
      setShowAnonymizedValues: mockSetShowAnonymizedValues,
    });

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).toBeDisabled();
  });
});
