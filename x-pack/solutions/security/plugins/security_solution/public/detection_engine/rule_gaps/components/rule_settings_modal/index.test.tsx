/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { gapReasonType } from '@kbn/alerting-plugin/common';
import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../../common/constants';
import type { GapAutoFillSchedulerResponse } from '../../types';
import { RuleSettingsModal } from '.';
import * as i18n from '../../translations';
import { useGapAutoFillSchedulerContext } from '../../context/gap_auto_fill_scheduler_context';
import {
  useCreateGapAutoFillScheduler,
  useUpdateGapAutoFillScheduler,
} from '../../api/hooks/use_gap_auto_fill_scheduler';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../context/gap_auto_fill_scheduler_context');
jest.mock('../../api/hooks/use_gap_auto_fill_scheduler');
jest.mock('../gap_auto_fill_logs', () => ({
  GapAutoFillLogsFlyout: jest.fn(() => null),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseAppToasts = useAppToasts as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseGapAutoFillSchedulerContext = useGapAutoFillSchedulerContext as jest.Mock;
const mockUseCreateGapAutoFillScheduler = useCreateGapAutoFillScheduler as jest.Mock;
const mockUseUpdateGapAutoFillScheduler = useUpdateGapAutoFillScheduler as jest.Mock;

describe('RuleSettingsModal', () => {
  const onClose = jest.fn();
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const createMutateAsync = jest.fn();
  const updateMutateAsync = jest.fn();
  const uiSettingsGet = jest.fn();
  const uiSettingsSet = jest.fn();

  const scheduler: GapAutoFillSchedulerResponse = {
    id: 'scheduler-1',
    name: 'default',
    enabled: false,
    gapFillRange: '1h',
    maxBackfills: 50,
    numRetries: 3,
    schedule: { interval: '1h' },
    scope: ['securitySolution'],
    ruleTypes: [{ type: 'query', consumer: 'siem' }],
    excludedReasons: [gapReasonType.RULE_DISABLED],
    createdBy: null,
    updatedBy: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAppToasts.mockReturnValue({ addSuccess, addError });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: true,
      canEditGapAutoFill: true,
      hasEnterpriseLicense: true,
      scheduler,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });

    createMutateAsync.mockResolvedValue(undefined);
    updateMutateAsync.mockResolvedValue(undefined);
    uiSettingsGet.mockReturnValue([gapReasonType.RULE_DISABLED]);
    uiSettingsSet.mockResolvedValue(true);

    mockUseCreateGapAutoFillScheduler.mockReturnValue({
      mutateAsync: createMutateAsync,
      isLoading: false,
    });
    mockUseUpdateGapAutoFillScheduler.mockReturnValue({
      mutateAsync: updateMutateAsync,
      isLoading: false,
    });

    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: true } } },
        uiSettings: {
          get: uiSettingsGet,
          set: uiSettingsSet,
        },
      },
    });
  });

  it('updates existing scheduler and advanced setting on save', async () => {
    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('rule-settings-save'));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        ...scheduler,
        enabled: false,
        excludedReasons: [gapReasonType.RULE_DISABLED],
      });
    });

    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(uiSettingsSet).toHaveBeenCalledWith(EXCLUDED_GAP_REASONS_KEY, [
      gapReasonType.RULE_DISABLED,
    ]);
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates scheduler when enabled is turned on and no scheduler exists', async () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: true,
      canEditGapAutoFill: true,
      hasEnterpriseLicense: true,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: false } } },
        uiSettings: {
          get: uiSettingsGet,
          set: uiSettingsSet,
        },
      },
    });

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('rule-settings-enable-switch'));
    fireEvent.click(screen.getByTestId('rule-settings-save'));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        excludedReasons: [gapReasonType.RULE_DISABLED],
      });
    });

    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(uiSettingsSet).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not create scheduler when no scheduler exists and auto-fill stays disabled', async () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: true,
      canEditGapAutoFill: true,
      hasEnterpriseLicense: true,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: false } } },
        uiSettings: {
          get: uiSettingsGet,
          set: uiSettingsSet,
        },
      },
    });

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('rule-settings-save'));

    await waitFor(() => {
      expect(addSuccess).toHaveBeenCalledTimes(1);
    });

    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(uiSettingsSet).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error toast and does not close when scheduler update fails', async () => {
    updateMutateAsync.mockRejectedValueOnce(new Error('update failed'));

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('rule-settings-save'));

    await waitFor(() => {
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: i18n.RULE_SETTINGS_TOAST_TITLE,
      });
    });

    expect(addSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables switch and save when user cannot edit auto-fill', () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: true,
      canEditGapAutoFill: false,
      hasEnterpriseLicense: true,
      scheduler,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: false } } },
        uiSettings: {
          get: uiSettingsGet,
          set: uiSettingsSet,
        },
      },
    });

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    expect(screen.getByTestId('rule-settings-enable-switch')).toBeDisabled();
    expect(screen.getByTestId('rule-settings-save')).toBeDisabled();
  });

  it('renders modal with gap scope section when only gapReasonDetectionEnabled is true', () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: false,
      canEditGapAutoFill: false,
      hasEnterpriseLicense: false,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    expect(screen.getByTestId('rule-settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('include-disabled-gaps-checkbox')).toBeInTheDocument();
    expect(screen.queryByTestId('rule-settings-enable-switch')).not.toBeInTheDocument();
  });

  it('shows description without auto-fill text when canAccessGapAutoFill is false', () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: false,
      canEditGapAutoFill: false,
      hasEnterpriseLicense: false,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    expect(
      screen.getByText('Define what counts as a gap in your rule monitoring.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/automatic gap filling/)).not.toBeInTheDocument();
  });

  it('shows description with auto-fill text when canAccessGapAutoFill is true', () => {
    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    expect(
      screen.getByText(
        'Define what counts as a gap in your rule monitoring and what will be included in automatic gap filling.'
      )
    ).toBeInTheDocument();
  });

  it('disables gap-scope checkbox when advanced settings save is not allowed', () => {
    mockUseGapAutoFillSchedulerContext.mockReturnValue({
      canAccessGapAutoFill: false,
      canEditGapAutoFill: false,
      hasEnterpriseLicense: true,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: false } } },
        uiSettings: {
          get: uiSettingsGet,
          set: uiSettingsSet,
        },
      },
    });

    render(<RuleSettingsModal isOpen={true} onClose={onClose} />, { wrapper: TestProviders });

    expect(screen.getByTestId('include-disabled-gaps-checkbox')).toBeDisabled();
    expect(screen.getByTestId('rule-settings-save')).toBeDisabled();
  });
});
