/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { alertInputDataMock } from '../mocks';
import { RiskInputsUtilityBar } from './utility_bar';

describe('RiskInputsUtilityBar', () => {
  it('renders when at least one item is selected', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar riskInputs={[alertInputDataMock]} />
      </TestProviders>
    );
    expect(getByTestId('risk-input-utility-bar')).toBeInTheDocument();
  });

  it('is hidden by default', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar riskInputs={[]} />
      </TestProviders>
    );

    expect(queryByTestId('risk-input-utility-bar')).toBeNull();
  });

  it('renders selected risk input message', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          riskInputs={[alertInputDataMock, alertInputDataMock, alertInputDataMock]}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toHaveTextContent('3 selected risk contribution');
  });

  it('toggles the popover when button is clicked', () => {
    const { getByRole } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          riskInputs={[alertInputDataMock, alertInputDataMock, alertInputDataMock]}
        />
      </TestProviders>
    );

    fireEvent.click(getByRole('button'));

    expect(getByRole('dialog')).toBeInTheDocument();
  });
});
