/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { render, makeSyntheticsPermissionsCore } from '../../../utils/testing/rtl_helpers';
import { AdvancedSettingsForm } from './advanced_settings_form';

const loadedSettingsState = {
  dynamicSettings: {
    loading: false,
    locationMonitors: [],
    settings: DYNAMIC_SETTINGS_DEFAULTS,
  },
};

describe('AdvancedSettingsForm', () => {
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
});
