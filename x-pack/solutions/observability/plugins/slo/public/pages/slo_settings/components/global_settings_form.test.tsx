/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import React from 'react';
import { render } from '../../../utils/test_helper';
import { usePutGlobalSettings } from '../hooks/use_put_global_settings';
import { GlobalSettingsForm } from './global_settings_form';

jest.mock('../hooks/use_put_global_settings');

const usePutGlobalSettingsMock = usePutGlobalSettings as jest.Mock;

const UPDATED_AT = '2026-11-20T10:00:00.000Z';

const neverSaved: GetSLOGlobalSettingsResponse = {
  sliRetention: {
    enabled: false,
    periodDays: 365,
    updatedAt: null,
    effective: { enabled: false, periodDays: 365, source: 'default' },
  },
};

const savedEnabled: GetSLOGlobalSettingsResponse = {
  sliRetention: {
    enabled: true,
    periodDays: 400,
    updatedAt: UPDATED_AT,
    effective: { enabled: true, periodDays: 400, source: 'settings' },
  },
};

const overriddenNeverSaved: GetSLOGlobalSettingsResponse = {
  sliRetention: {
    enabled: false,
    periodDays: 365,
    updatedAt: null,
    effective: { enabled: true, periodDays: 200, source: 'config' },
  },
};

const overriddenSaved: GetSLOGlobalSettingsResponse = {
  sliRetention: {
    enabled: false,
    periodDays: 400,
    updatedAt: UPDATED_AT,
    effective: { enabled: true, periodDays: 200, source: 'config' },
  },
};

const getSwitch = () => screen.getByTestId('sloGlobalSettingsRetentionSwitch');
const getPeriod = () => screen.getByTestId('sloGlobalSettingsRetentionPeriod');
const getSaveButton = () => screen.getByTestId('sloGlobalSettingsSaveButton');

const clickSave = async () => {
  await waitFor(() => expect(getSaveButton()).toBeEnabled());
  await userEvent.click(getSaveButton());
};

const setPeriod = async (value: string) => {
  await userEvent.clear(getPeriod());
  await userEvent.type(getPeriod(), value);
};

describe('GlobalSettingsForm', () => {
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usePutGlobalSettingsMock.mockReturnValue({ mutate: mockMutate, isLoading: false });
  });

  it('shows the stored values', () => {
    render(<GlobalSettingsForm settings={savedEnabled} />);

    expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(getPeriod()).toHaveValue(400);
    expect(getPeriod()).toBeEnabled();
    expect(screen.queryByTestId('sloGlobalSettingsOverrideCallout')).not.toBeInTheDocument();
  });

  it('disables the period field while retention is off', () => {
    render(<GlobalSettingsForm settings={neverSaved} />);

    expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(getPeriod()).toBeDisabled();
  });

  it('is read-only with a callout showing the effective value when overridden in kibana.yml', () => {
    render(<GlobalSettingsForm settings={overriddenNeverSaved} />);

    expect(getSwitch()).toBeDisabled();
    expect(getPeriod()).toBeDisabled();
    expect(getSaveButton()).toBeDisabled();
    const callout = screen.getByTestId('sloGlobalSettingsOverrideCallout');
    expect(callout).toHaveTextContent('xpack.slo.sliRetention');
    expect(callout).toHaveTextContent('Applied value: enabled, 200 days.');
    expect(callout).not.toHaveTextContent('The saved value');
  });

  it('mentions the saved value in the callout when one exists', () => {
    render(<GlobalSettingsForm settings={overriddenSaved} />);

    expect(screen.getByTestId('sloGlobalSettingsOverrideCallout')).toHaveTextContent(
      'The saved value (disabled, 400 days) applies once the setting is removed from kibana.yml.'
    );
  });

  it('asks for confirmation before enabling retention', async () => {
    render(<GlobalSettingsForm settings={neverSaved} />);

    await userEvent.click(getSwitch());
    await clickSave();

    const modal = await screen.findByTestId('sloSliRetentionConfirmModal');
    expect(modal).toHaveTextContent('older than 365 days');
    expect(mockMutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockMutate).toHaveBeenCalledWith({ sliRetention: { enabled: true, periodDays: 365 } });
    expect(screen.queryByTestId('sloSliRetentionConfirmModal')).not.toBeInTheDocument();
  });

  it('does not save when the confirmation is cancelled', async () => {
    render(<GlobalSettingsForm settings={neverSaved} />);

    await userEvent.click(getSwitch());
    await clickSave();
    await userEvent.click(await screen.findByTestId('confirmModalCancelButton'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sloSliRetentionConfirmModal')).not.toBeInTheDocument();
  });

  it('asks for confirmation before decreasing the period', async () => {
    render(<GlobalSettingsForm settings={savedEnabled} />);

    await setPeriod('200');
    await clickSave();

    expect(await screen.findByTestId('sloSliRetentionConfirmModal')).toHaveTextContent(
      'older than 200 days'
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('saves without confirmation when increasing the period', async () => {
    render(<GlobalSettingsForm settings={savedEnabled} />);

    await setPeriod('500');
    await clickSave();

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({ sliRetention: { enabled: true, periodDays: 500 } })
    );
    expect(screen.queryByTestId('sloSliRetentionConfirmModal')).not.toBeInTheDocument();
  });

  it('saves without confirmation when disabling retention', async () => {
    render(<GlobalSettingsForm settings={savedEnabled} />);

    await userEvent.click(getSwitch());
    await clickSave();

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({ sliRetention: { enabled: false, periodDays: 400 } })
    );
    expect(screen.queryByTestId('sloSliRetentionConfirmModal')).not.toBeInTheDocument();
  });

  it.each(['179', '3651', '200.5'])('rejects a period of %s days', async (value) => {
    render(<GlobalSettingsForm settings={savedEnabled} />);

    await setPeriod(value);

    await waitFor(() => expect(getSaveButton()).toBeDisabled());
    expect(getPeriod()).toBeInvalid();
  });
});
