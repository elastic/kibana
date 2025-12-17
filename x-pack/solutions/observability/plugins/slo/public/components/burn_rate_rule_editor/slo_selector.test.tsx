/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { emptySloList, sloList } from '../../data/slo/slo';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { render } from '../../utils/test_helper';
import { SloSelector } from './slo_selector';

jest.mock('../../hooks/use_fetch_slo_definitions');
jest.mock('./slo_selector_empty_state', () => ({
  SloSelectorEmptyState: () => <div data-test-subj="sloSelectorEmptyState" />,
}));
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiLoadingSpinner: () => <div data-test-subj="sloSelectorLoadingSpinner" />,
}));

const useFetchSloDefinitionsMock = useFetchSloDefinitions as jest.Mock;

describe('SLO Selector', () => {
  const onSelectedSpy = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a spinner when loading for the first time', async () => {
    useFetchSloDefinitionsMock.mockReturnValue({ isInitialLoading: true, data: undefined });

    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(screen.getByTestId('sloSelectorLoadingSpinner')).toBeInTheDocument();
  });

  it('renders an empty state when there are no SLOs', async () => {
    useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: emptySloList });

    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(screen.getByTestId('sloSelectorEmptyState')).toBeInTheDocument();
  });

  it('fetches SLOs asynchronously', async () => {
    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: '' });
  });

  it('searches SLOs when typing', async () => {
    useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloList });

    render(<SloSelector onSelected={onSelectedSpy} />);

    const input = screen.getByTestId('comboBoxInput');
    await userEvent.type(input, 'latency', { delay: 1 });

    await waitFor(() =>
      expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' })
    );

    expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' });
  });

  it('does not render empty state when there is a search term', async () => {
    useFetchSloDefinitionsMock
      .mockReturnValueOnce({ isLoading: false, data: sloList })
      .mockReturnValueOnce({ isLoading: false, data: emptySloList });

    render(<SloSelector onSelected={onSelectedSpy} />);

    const input = screen.getByTestId('comboBoxInput');
    await userEvent.type(input, 'latency', { delay: 1 });

    await waitFor(() =>
      expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' })
    );

    expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' });
  });

  it('renders options when there are SLOs', async () => {
    useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloList });

    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(screen.getByTestId('sloSelector')).toBeInTheDocument();
  });
});
