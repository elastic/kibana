/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SloInstanceSelector } from './slo_instance_selector';
import { render } from '../../../utils/test_helper';
import { useFetchSloInstances } from '../../../hooks/use_fetch_slo_instances';

jest.mock('../../../hooks/use_fetch_slo_instances');

const useFetchSloInstancesMock = useFetchSloInstances as jest.MockedFunction<
  typeof useFetchSloInstances
>;

const createHookResponse = (instances: string[] = []) => ({
  data: {
    results: instances.map((instanceId) => ({
      instanceId,
      groupings: {},
    })),
  },
  isLoading: false,
  isInitialLoading: false,
  isError: false,
});

describe('SloInstanceSelector', () => {
  let lastParams: Parameters<typeof useFetchSloInstances>[0] | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    lastParams = undefined;
    useFetchSloInstancesMock.mockImplementation((params) => {
      lastParams = params;
      return createHookResponse();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof SloInstanceSelector>> = {}
  ) => {
    const onSelected = jest.fn();
    render(<SloInstanceSelector sloId="slo-1" onSelected={onSelected} {...props} />);
    return { onSelected };
  };

  const openComboBox = async (user: ReturnType<typeof userEvent.setup>) => {
    const comboContainer = screen.getByTestId('sloInstanceSelector');
    const toggle = within(comboContainer).getByTestId('comboBoxToggleListButton');
    await user.click(toggle);
    // Wait for the options list to appear
    await waitFor(() => {
      const listbox = document.querySelector('[role="listbox"]');
      const emptyList = document.querySelector('.euiComboBoxOptionsList__empty');
      expect(listbox || emptyList).toBeInTheDocument();
    });
    return comboContainer;
  };

  it('selects a specific instance and forwards remoteName to the fetch hook', async () => {
    useFetchSloInstancesMock.mockImplementation((params) => {
      lastParams = params;
      return createHookResponse(['instance-a', 'instance-b']);
    });

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { onSelected } = renderComponent({ remoteName: 'remote-1' });

    await openComboBox(user);
    await user.click(await screen.findByText('instance-a'));

    expect(onSelected).toHaveBeenLastCalledWith('instance-a');
    expect(lastParams).toMatchObject({ sloId: 'slo-1', remoteName: 'remote-1' });
  });

  it('handles the "All instances" option and switching back to a single instance', async () => {
    useFetchSloInstancesMock.mockReturnValue(createHookResponse(['alpha', 'beta']));

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { onSelected } = renderComponent();

    await openComboBox(user);
    await user.click(await screen.findByText(/All instances/i));

    expect(onSelected).toHaveBeenLastCalledWith(ALL_VALUE);

    // Wait for the combo box to close after selection
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).not.toBeInTheDocument();
    });

    await openComboBox(user);
    // Wait for the option to appear in the listbox
    const betaOption = await waitFor(() => {
      const listbox = document.querySelector('[role="listbox"]');
      if (!listbox) throw new Error('Listbox not found');
      const option = within(listbox as HTMLElement).queryByText('beta');
      if (!option) throw new Error('Option "beta" not found');
      return option;
    });
    await user.click(betaOption);

    expect(onSelected).toHaveBeenLastCalledWith('beta');
  });
});
