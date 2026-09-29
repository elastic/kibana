/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { render, makeSyntheticsPermissionsCore } from '../../../utils/testing/rtl_helpers';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { useCanManageClusterSettings } from './use_can_manage_cluster_settings';

jest.mock('./use_can_manage_cluster_settings');
const mockUseCanManageClusterSettings = jest.mocked(useCanManageClusterSettings);

const loadedSettingsState = {
  dynamicSettings: {
    loading: false,
    locationMonitors: [],
    settings: DYNAMIC_SETTINGS_DEFAULTS,
  },
};

describe('AdvancedSettingsForm', () => {
  beforeEach(() => {
    mockUseCanManageClusterSettings.mockReturnValue({ canManage: true, loading: false });
  });

  it('enables Apply after toggling shard rebalancing off', () => {
    const { getByTestId } = render(<AdvancedSettingsForm />, { state: loadedSettingsState });

    const toggle = getByTestId('syntheticsRebalanceShardsEnabledSwitch');
    const apply = getByTestId('syntheticsAdvancedSettingsApplyButton');

    expect(toggle).toBeChecked();
    expect(apply).toBeDisabled();

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(apply).not.toBeDisabled();
  });

  it('discards an unsaved rebalance toggle', () => {
    const { getByTestId } = render(<AdvancedSettingsForm />, { state: loadedSettingsState });

    const toggle = getByTestId('syntheticsRebalanceShardsEnabledSwitch');
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();

    fireEvent.click(getByTestId('syntheticsAdvancedSettingsDiscardButton'));

    expect(toggle).toBeChecked();
    expect(getByTestId('syntheticsAdvancedSettingsApplyButton')).toBeDisabled();
  });

  it('disables the rebalance switch without configureSettings', () => {
    const { getByTestId, getByText } = render(<AdvancedSettingsForm />, {
      state: loadedSettingsState,
      core: makeSyntheticsPermissionsCore({ configureSettings: false }),
    });

    expect(
      getByText(/You do not have sufficient permissions to edit these settings/)
    ).toBeInTheDocument();
    expect(getByTestId('syntheticsRebalanceShardsEnabledSwitch')).toBeDisabled();
    expect(getByTestId('syntheticsAdvancedSettingsApplyButton')).toBeDisabled();
  });

  it('disables cluster-wide settings without the global private location privilege', async () => {
    mockUseCanManageClusterSettings.mockReturnValue({ canManage: false, loading: false });
    const { getByTestId, findByText } = render(<AdvancedSettingsForm />, {
      state: loadedSettingsState,
    });

    expect(getByTestId('syntheticsAdvancedSettingsClusterPrivilegeCallout')).toBeInTheDocument();
    expect(getByTestId('syntheticsRebalanceShardsEnabledSwitch')).toBeDisabled();
    expect(getByTestId('syntheticsSyncIntervalField')).toBeDisabled();
    expect(getByTestId('syntheticsAdvancedSettingsApplyButton')).toBeDisabled();

    fireEvent.mouseOver(getByTestId('syntheticsRebalanceShardsEnabledSwitch'));
    await waitFor(async () =>
      expect(
        await findByText(/Requires the "Can manage private locations" privilege in all spaces/)
      ).toBeInTheDocument()
    );
  });
});
