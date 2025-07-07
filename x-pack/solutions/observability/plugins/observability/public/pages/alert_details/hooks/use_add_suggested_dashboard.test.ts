/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useAddSuggestedDashboards } from './use_add_suggested_dashboard';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { DashboardMetadata } from '../components/related_dashboards/dashboard_tile';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
let capturedOnSuccess: (data: Rule) => Promise<void> | undefined;
let capturedOnError: ((error: any) => void) | undefined;

// Test constants
const TEST_RULE_ID = 'test-rule-id';
const EXISTING_DASHBOARD_ID = 'existing-dashboard-id';
const TEST_RULE_NAME = 'Test Rule';

const TEST_DASHBOARD = {
  id: 'new-dashboard-id',
  title: 'Test Dashboard',
  description: 'Test Description',
};

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const mockUpdateRule = jest.fn();

jest.mock('@kbn/response-ops-rule-form/src/common/hooks', () => ({
  useUpdateRule: jest.fn(
    (params: { onSuccess: (data: Rule) => Promise<void>; onError: (error: any) => void }) => {
      capturedOnSuccess = params.onSuccess;
      capturedOnError = params.onError;
      return { mutateAsync: mockUpdateRule };
    }
  ),
}));

const mockRule = {
  id: TEST_RULE_ID,
  ruleTypeId: 'apm',
  name: TEST_RULE_NAME,
  artifacts: {
    dashboards: [{ id: EXISTING_DASHBOARD_ID }],
  },
} as unknown as Rule;

const mockOnSuccessAddSuggestedDashboard = jest.fn();

const mockDashboard: DashboardMetadata = {
  id: TEST_DASHBOARD.id,
  title: TEST_DASHBOARD.title,
  description: TEST_DASHBOARD.description,
};

describe('useAddSuggestedDashboards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have addingDashboardId as undefined when initially rendered', () => {
    const { result } = renderHook(() =>
      useAddSuggestedDashboards({
        rule: mockRule,
        onSuccessAddSuggestedDashboard: mockOnSuccessAddSuggestedDashboard,
      })
    );

    expect(result.current.addingDashboardId).toBeUndefined();
  });

  it('should update addingDashboardId and call updateRule when onClickAddSuggestedDashboard is called', () => {
    const { result } = renderHook(() =>
      useAddSuggestedDashboards({
        rule: mockRule,
        onSuccessAddSuggestedDashboard: mockOnSuccessAddSuggestedDashboard,
      })
    );

    act(() => {
      result.current.onClickAddSuggestedDashboard(mockDashboard);
    });

    // Check that addingDashboardId is updated
    expect(result.current.addingDashboardId).toBe(TEST_DASHBOARD.id);

    // Check that updateRule is called with correct parameters
    expect(mockUpdateRule).toHaveBeenCalledWith({
      id: TEST_RULE_ID,
      formData: {
        id: TEST_RULE_ID,
        ruleTypeId: 'apm',
        name: TEST_RULE_NAME,
        artifacts: {
          dashboards: [{ id: EXISTING_DASHBOARD_ID }, { id: TEST_DASHBOARD.id }],
        },
      },
    });
  });

  it('should call onSuccessAddSuggestedDashboard and reset addingDashboardId on success', async () => {
    const { result } = renderHook(() =>
      useAddSuggestedDashboards({
        rule: mockRule,
        onSuccessAddSuggestedDashboard: mockOnSuccessAddSuggestedDashboard,
      })
    );

    // First, trigger onClickAddSuggestedDashboard to set addingDashboardId
    act(() => {
      result.current.onClickAddSuggestedDashboard(mockDashboard);
    });

    // Verify addingDashboardId is set
    expect(result.current.addingDashboardId).toBe(TEST_DASHBOARD.id);

    // Now trigger the onSuccess callback
    const updatedRule = {
      id: TEST_RULE_ID,
      ruleTypeId: 'apm',
      name: TEST_RULE_NAME,
      artifacts: {
        dashboards: [{ id: EXISTING_DASHBOARD_ID }, { id: TEST_DASHBOARD.id }],
      },
    } as unknown as Rule;

    await act(async () => {
      await capturedOnSuccess!(updatedRule);
    });

    expect(mockOnSuccessAddSuggestedDashboard).toHaveBeenCalled();

    // Check that addingDashboardId is reset to undefined
    expect(result.current.addingDashboardId).toBeUndefined();

    // Check that notifications.toasts.addSuccess was called
    expect(mockUseKibanaReturnValue.services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Added to linked dashboard',
      text: `From now on, this dashboard will be linked to all alerts triggered by this rule`,
    });
  });

  it('should reset addingDashboardId and show error notification on error', () => {
    const { result } = renderHook(() =>
      useAddSuggestedDashboards({
        rule: mockRule,
        onSuccessAddSuggestedDashboard: mockOnSuccessAddSuggestedDashboard,
      })
    );

    // First, trigger onClickAddSuggestedDashboard to set addingDashboardId
    act(() => {
      result.current.onClickAddSuggestedDashboard(mockDashboard);
    });

    // Verify addingDashboardId is set
    expect(result.current.addingDashboardId).toBe(TEST_DASHBOARD.id);

    // Create a mock error
    const mockError = {
      message: 'Failed to update rule',
      body: { message: 'Server error' },
    };

    // Now trigger the onError callback
    act(() => {
      capturedOnError!(mockError);
    });

    // Check that addingDashboardId is reset to undefined
    expect(result.current.addingDashboardId).toBeUndefined();

    // Check that notifications.toasts.addError was called
    expect(mockUseKibanaReturnValue.services.notifications.toasts.addError).toHaveBeenCalledWith(
      mockError,
      {
        title: 'Error adding suggested dashboard',
      }
    );
  });
});
