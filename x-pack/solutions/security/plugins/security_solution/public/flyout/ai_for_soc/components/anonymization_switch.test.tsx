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
import { AIForSOCDetailsContext } from '../context';

const mockSetShowAnonymizedValues = jest.fn();
const mockContextValue = {
  showAnonymizedValues: false,
  setShowAnonymizedValues: mockSetShowAnonymizedValues,
} as unknown as AIForSOCDetailsContext;

const renderAnonymizedSwitch = (contextValue: AIForSOCDetailsContext, hasAlertSummary: boolean) =>
  render(
    <AIForSOCDetailsContext.Provider value={contextValue}>
      <AnonymizationSwitch hasAlertSummary={hasAlertSummary} />
    </AIForSOCDetailsContext.Provider>
  );

describe('AnonymizationSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the switch in the unchecked state by default', () => {
    const { getByTestId } = renderAnonymizedSwitch(mockContextValue, true);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeChecked();
  });

  it('should call setShowAnonymizedValues with true when the switch is toggled on', () => {
    const { getByTestId } = renderAnonymizedSwitch(mockContextValue, true);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(true);
  });

  it('should call setShowAnonymizedValues with false when the switch is toggled off', () => {
    const contextValue = {
      ...mockContextValue,
      showAnonymizedValues: true,
    };

    const { getByTestId } = renderAnonymizedSwitch(contextValue, true);

    fireEvent.click(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockSetShowAnonymizedValues).toHaveBeenCalledWith(false);
  });

  it('should not render the switch if showAnonymizedValues is undefined', () => {
    const contextValue = {
      ...mockContextValue,
      showAnonymizedValues: undefined,
    };

    const { queryByTestId } = renderAnonymizedSwitch(contextValue, true);

    expect(queryByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should enable the switch when hasAlertSummary is true', () => {
    const { getByTestId } = renderAnonymizedSwitch(mockContextValue, true);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeDisabled();
  });

  it('should disable the switch when hasAlertSummary is false', () => {
    const { getByTestId } = renderAnonymizedSwitch(mockContextValue, false);

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).toBeDisabled();
  });
});
