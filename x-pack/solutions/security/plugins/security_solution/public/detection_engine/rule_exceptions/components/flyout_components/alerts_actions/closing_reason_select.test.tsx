/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ClosingReasonSelect } from './closing_reason_select';
import { TestProviders } from '../../../../../common/mock';
import { useUiSetting$ } from '../../../../../common/lib/kibana';

jest.mock('../../../../../common/lib/kibana');

const useUiSettingMock = useUiSetting$ as jest.Mock;

const CLOSE_WITHOUT_REASON_LABEL = 'Close without reason';
const DUPLICATE_LABEL = 'Duplicate';

type ComponentProps = React.ComponentProps<typeof ClosingReasonSelect>;

const renderComponent = (props: Partial<ComponentProps> = {}) =>
  render(
    <TestProviders>
      <ClosingReasonSelect onChange={jest.fn()} {...props} />
    </TestProviders>
  );

const openSelect = async () => {
  await userEvent.click(screen.getByTestId('exceptionFlyoutCloseReasonSelect'));
};

describe('ClosingReasonSelect', () => {
  beforeEach(() => {
    useUiSettingMock.mockReturnValue([[], jest.fn()]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selects "close without reason" when no value is provided', () => {
    renderComponent();

    expect(screen.getByTestId('exceptionFlyoutCloseReasonSelect')).toHaveTextContent(
      CLOSE_WITHOUT_REASON_LABEL
    );
  });

  it('displays the label of the provided reason', () => {
    renderComponent({ value: 'duplicate' });

    expect(screen.getByTestId('exceptionFlyoutCloseReasonSelect')).toHaveTextContent(
      DUPLICATE_LABEL
    );
  });

  it('reports the reason key when a predefined reason is selected', async () => {
    const onChange = jest.fn();
    renderComponent({ onChange });

    await openSelect();
    await userEvent.click(screen.getByRole('option', { name: DUPLICATE_LABEL }));

    expect(onChange).toHaveBeenCalledWith('duplicate');
  });

  it('reports undefined when "close without reason" is selected', async () => {
    const onChange = jest.fn();
    renderComponent({ onChange, value: 'duplicate' });

    await openSelect();
    await userEvent.click(screen.getByRole('option', { name: CLOSE_WITHOUT_REASON_LABEL }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('offers custom reasons configured through advanced settings', async () => {
    const onChange = jest.fn();
    useUiSettingMock.mockReturnValue([['custom reason'], jest.fn()]);
    renderComponent({ onChange });

    await openSelect();
    await userEvent.click(screen.getByRole('option', { name: 'custom reason' }));

    expect(onChange).toHaveBeenCalledWith('custom reason');
  });

  it('renders the predefined reasons when the custom reasons setting is unset', async () => {
    useUiSettingMock.mockReturnValue([undefined, jest.fn()]);
    renderComponent();

    await openSelect();

    expect(screen.getByRole('option', { name: DUPLICATE_LABEL })).toBeInTheDocument();
  });

  it('is disabled when "disabled" is true', () => {
    renderComponent({ disabled: true });

    expect(screen.getByTestId('exceptionFlyoutCloseReasonSelect')).toBeDisabled();
  });
});
