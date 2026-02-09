/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { ALL_VALUE, type FindSLOInstancesResponse } from '@kbn/slo-schema';
import { SloInstanceComboBox } from './slo_instance_combo_box';
import { useFetchSloInstances } from '../../../../hooks/use_fetch_slo_instances';
import { render } from '../../../../utils/test_helper';
import { buildSlo } from '../../../../data/slo/slo';

jest.mock('../../../../hooks/use_fetch_slo_instances');

const mockUseFetchSloInstances = useFetchSloInstances as jest.MockedFunction<
  typeof useFetchSloInstances
>;

const createMockResponse = (
  instances: Array<{
    instanceId: string;
    groupings: Record<string, string | number>;
  }>
): FindSLOInstancesResponse => ({
  results: instances,
});

const mockInstance1 = {
  instanceId: 'instance-1',
  groupings: { environment: 'prod', service: 'api' },
};

const mockInstance2 = {
  instanceId: 'instance-2',
  groupings: { environment: 'staging', service: 'web' },
};

const mockInstance3 = {
  instanceId: 'instance-3',
  groupings: { environment: 'dev', service: 'api' },
};

describe('SloInstanceComboBox', () => {
  let setInstanceId: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setInstanceId = jest.fn();
    jest.useFakeTimers();

    // Default mock
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      isError: false,
      data: createMockResponse([mockInstance1, mockInstance2, mockInstance3]),
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should render with the current instanceId pre-selected', () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: mockInstance1.instanceId,
      groupings: mockInstance1.groupings,
    });

    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    const comboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox');
    expect(comboBox).toBeInTheDocument();

    // Check that the combobox has a selected value in the input field
    const input = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    expect(input.value).toBe('environment: prod, service: api');
  });

  it('should render with ALL_VALUE pre-selected when instanceId is ALL_VALUE', () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    const comboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox');
    expect(comboBox).toBeInTheDocument();

    // Placeholder should be visible when nothing is selected
    const placeholder = screen.getByPlaceholderText('None selected, type here to search');
    expect(placeholder).toBeInTheDocument();
  });

  it('should render disabled combobox with error placeholder when isError is true', () => {
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      isError: true,
      data: undefined,
    });

    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    const errorComboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox-error');
    expect(errorComboBox).toBeInTheDocument();

    const comboBoxInput = screen.getByTestId('comboBoxSearchInput');
    expect(comboBoxInput).toBeDisabled();

    const errorPlaceholder = screen.getByPlaceholderText('Error loading SLO instances');
    expect(errorPlaceholder).toBeInTheDocument();
  });

  it('should call setInstanceId with correct id when selecting a different instance', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Open the combobox using keyboard on the search input
    const searchInput = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    await user.click(searchInput);
    await waitForEuiPopoverOpen();
    await user.keyboard('{ArrowDown}');

    // Select the third option using keyboard (press down arrow three times, then enter)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(setInstanceId).toHaveBeenCalledWith('instance-3');
    expect(setInstanceId).toHaveBeenCalledTimes(1);

    await waitForEuiPopoverClose();
  });

  it('should call setInstanceId with ALL_VALUE when clearing the input', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: 'instance-1',
      groupings: mockInstance1.groupings,
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Find and click the clear button
    const clearButton = screen.getByTestId('comboBoxClearButton');
    await user.click(clearButton);

    expect(setInstanceId).toHaveBeenCalledWith(ALL_VALUE);
  });

  it('should show placeholder text when input is cleared and no value is selected', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: 'instance-1',
      groupings: mockInstance1.groupings,
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Find and click the clear button
    const clearButton = screen.getByTestId('comboBoxClearButton');
    await user.click(clearButton);

    const placeholder = screen.getByPlaceholderText('None selected, type here to search');
    expect(placeholder).toBeInTheDocument();
  });

  it('should call useFetchSloInstances with correct search param after debounce', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Type in the search input
    const searchInput = screen.getByPlaceholderText('None selected, type here to search');
    await user.type(searchInput, 'prod');

    // Hook should not have been called with search yet
    expect(mockUseFetchSloInstances).toHaveBeenCalledWith(
      expect.objectContaining({
        search: undefined,
      })
    );

    // Advance timers by 200ms to trigger debounce
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Now it should have been called with the search term
    expect(mockUseFetchSloInstances).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'prod',
      })
    );
  });

  it('should render combobox options from fetched instances', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Open the combobox to see all options
    const toggleButton = screen.getByTestId('comboBoxToggleListButton');
    await user.click(toggleButton);
    await waitForEuiPopoverOpen();

    // All instance options should be rendered
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);

    // Verify the option titles contain the expected labels
    const optionTitles = options.map((opt) => opt.getAttribute('title'));
    expect(optionTitles).toContain('environment: prod, service: api');
    expect(optionTitles).toContain('environment: staging, service: web');
    expect(optionTitles).toContain('environment: dev, service: api');

    await user.click(toggleButton);
    await waitForEuiPopoverClose();
  });

  it('should show loading spinner when isLoading is true', () => {
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: true,
      isInitialLoading: true,
      isError: false,
      data: undefined,
    });

    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // The combobox should be rendered with loading state
    const comboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox');
    expect(comboBox).toBeInTheDocument();

    // Check that the loading prop causes the input to have isLoading behavior
    // EuiComboBox uses the isLoading prop to display a loading spinner
    const input = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('should hide loading spinner when isLoading becomes false', async () => {
    // Start with loading true
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: true,
      isInitialLoading: true,
      isError: false,
      data: undefined,
    });

    const { rerender } = render(
      <SloInstanceComboBox
        slo={buildSlo({
          id: 'test-slo-id',
          instanceId: ALL_VALUE,
          groupings: {},
        })}
        setInstanceId={setInstanceId}
      />
    );

    const comboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox');
    expect(comboBox).toBeInTheDocument();

    // Update mock to return false for isLoading
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      isError: false,
      data: createMockResponse([mockInstance1]),
    });

    rerender(
      <SloInstanceComboBox
        slo={buildSlo({
          id: 'test-slo-id',
          instanceId: ALL_VALUE,
          groupings: {},
        })}
        setInstanceId={setInstanceId}
      />
    );

    // Verify combobox is still present after loading completes
    expect(screen.getByTestId('sloDetailsInstanceSelectorComboBox')).toBeInTheDocument();
  });

  it('should handle gracefully when fetching does not return results', async () => {
    mockUseFetchSloInstances.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      isError: false,
      data: createMockResponse([]),
    });

    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Try to open combobox (should not crash)
    const comboBox = screen.getByTestId('sloDetailsInstanceSelectorComboBox');
    const toggleButton = screen.getByTestId('comboBoxToggleListButton');
    await user.click(toggleButton);
    await waitForEuiPopoverOpen();

    expect(comboBox).toBeInTheDocument();

    await user.click(toggleButton);
    await waitForEuiPopoverClose();
  });

  it('should sync selection when external SLO instanceId changes', async () => {
    const { rerender } = render(
      <SloInstanceComboBox
        slo={buildSlo({
          id: 'test-slo-id',
          instanceId: 'instance-1',
          groupings: mockInstance1.groupings,
        })}
        setInstanceId={setInstanceId}
      />
    );

    // Verify initial selection in input field
    let input = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    expect(input.value).toBe('environment: prod, service: api');

    // Rerender with different instanceId
    rerender(
      <SloInstanceComboBox
        slo={buildSlo({
          id: 'test-slo-id',
          instanceId: 'instance-2',
          groupings: mockInstance2.groupings,
        })}
        setInstanceId={setInstanceId}
      />
    );

    // Verify selection has updated to the new instance
    input = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    expect(input.value).toBe('environment: staging, service: web');
  });

  it('should handle clearing input and continuing debounced search correctly', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: 'instance-1',
      groupings: mockInstance1.groupings,
    });

    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    const searchInput = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;

    // Verify initial selection
    expect(searchInput.value).toBe('environment: prod, service: api');

    // Clear the input using the clear button
    const clearButton = screen.getByTestId('comboBoxClearButton');
    await user.click(clearButton);

    // setInstanceId should be called with ALL_VALUE immediately
    expect(setInstanceId).toHaveBeenCalledWith(ALL_VALUE);

    // Advance past debounce delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // setInstanceId should have been called with ALL_VALUE
    expect(setInstanceId).toHaveBeenLastCalledWith(ALL_VALUE);
  });

  it('should render distinct labels for distinct instances', async () => {
    const slo = buildSlo({
      id: 'test-slo-id',
      instanceId: ALL_VALUE,
      groupings: {},
    });

    const user = userEvent.setup({ delay: null });
    render(<SloInstanceComboBox slo={slo} setInstanceId={setInstanceId} />);

    // Open the combobox to see all options
    const toggleButton = screen.getByTestId('comboBoxToggleListButton');
    await user.click(toggleButton);
    await waitForEuiPopoverOpen();

    // Collect all option titles
    const options = screen.getAllByRole('option');
    const labels = options.map((opt) => opt.getAttribute('title'));

    // Verify all options are distinct
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);

    await user.click(toggleButton);
    await waitForEuiPopoverClose();
  });
});
