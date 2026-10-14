/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { SettingsActions } from './settings_actions';
import type { SettingsActionsProps } from './settings_actions';

const defaultProps: SettingsActionsProps = {
  isFormDisabled: false,
  isFormDirty: false,
  isFormValid: true,
  onApply: jest.fn(),
  onCancel: jest.fn(),
  errors: null,
};

const renderActions = (overrides: Partial<SettingsActionsProps> = {}) =>
  render(<SettingsActions {...defaultProps} {...overrides} />);

describe('SettingsActions', () => {
  it('apply button is disabled when form is not dirty', () => {
    renderActions();
    expect(screen.getByTestId('apply-settings-button')).toBeDisabled();
  });

  it('apply button is enabled when form is dirty and valid', () => {
    renderActions({ isFormDirty: true, isFormValid: true });
    expect(screen.getByTestId('apply-settings-button')).not.toBeDisabled();
  });

  it('apply button is disabled when form is dirty but invalid', () => {
    renderActions({ isFormDirty: true, isFormValid: false });
    expect(screen.getByTestId('apply-settings-button')).toBeDisabled();
  });

  it('apply button is disabled when form is disabled', () => {
    renderActions({ isFormDirty: true, isFormValid: true, isFormDisabled: true });
    expect(screen.getByTestId('apply-settings-button')).toBeDisabled();
  });
});
