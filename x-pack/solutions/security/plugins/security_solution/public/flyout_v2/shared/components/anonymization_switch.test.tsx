/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import {
  DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID,
  AnonymizationSwitch,
} from './anonymization_switch';

const renderAnonymizedSwitch = ({
  hasSummary,
  showAnonymizedValues,
  onChange,
}: {
  hasSummary: boolean;
  showAnonymizedValues: boolean | undefined;
  onChange: jest.Mock;
}) =>
  render(
    <AnonymizationSwitch
      hasSummary={hasSummary}
      showAnonymizedValues={showAnonymizedValues}
      onChange={onChange}
    />
  );

describe('AnonymizationSwitch', () => {
  let mockOnChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange = jest.fn();
  });

  it('should render the switch in the unchecked state by default', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasSummary: true,
      showAnonymizedValues: false,
      onChange: mockOnChange,
    });

    expect(getByTestId(DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeChecked();
  });

  it('should call onChange when the switch is toggled', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasSummary: true,
      showAnonymizedValues: false,
      onChange: mockOnChange,
    });

    fireEvent.click(getByTestId(DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID));

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should not render the switch if showAnonymizedValues is undefined', () => {
    const { queryByTestId } = renderAnonymizedSwitch({
      hasSummary: true,
      showAnonymizedValues: undefined,
      onChange: mockOnChange,
    });

    expect(queryByTestId(DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should enable the switch when hasSummary is true', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasSummary: true,
      showAnonymizedValues: false,
      onChange: mockOnChange,
    });

    expect(getByTestId(DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).not.toBeDisabled();
  });

  it('should disable the switch when hasSummary is false', () => {
    const { getByTestId } = renderAnonymizedSwitch({
      hasSummary: false,
      showAnonymizedValues: false,
      onChange: mockOnChange,
    });

    expect(getByTestId(DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).toBeDisabled();
  });
});
