/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { hasMlAdminPermissions } from '../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../common/machine_learning/has_ml_license';
import {
  ML_JOB_SETTINGS_MENU_ITEM_TEST_ID,
  useMlJobSettingsMenuItem,
} from './use_ml_job_settings_menu_item';

jest.mock('../../../../common/machine_learning/has_ml_admin_permissions');
jest.mock('../../../../common/machine_learning/has_ml_license');
jest.mock('../ml/hooks/use_ml_capabilities', () => ({
  useMlCapabilities: () => ({}),
}));
jest.mock('../ml_popover/ml_settings_flyout', () => ({
  MlSettingsFlyout: ({ onClose }: { onClose: () => void }) => (
    <button type="button" data-test-subj="ml-settings-flyout-close" onClick={onClose} />
  ),
}));

const mockHasMlAdminPermissions = hasMlAdminPermissions as jest.Mock;
const mockHasMlLicense = hasMlLicense as jest.Mock;

describe('useMlJobSettingsMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an overflow item when the user is unlicensed', () => {
    mockHasMlLicense.mockReturnValue(false);
    mockHasMlAdminPermissions.mockReturnValue(false);

    const { result } = renderHook(() => useMlJobSettingsMenuItem());

    expect(result.current.item).toEqual(
      expect.objectContaining({
        id: 'mlJobSettings',
        overflow: true,
        testId: ML_JOB_SETTINGS_MENU_ITEM_TEST_ID,
      })
    );
    expect(result.current.flyout).toBeNull();
  });

  it('returns an overflow item when the user is licensed and an ML admin', () => {
    mockHasMlLicense.mockReturnValue(true);
    mockHasMlAdminPermissions.mockReturnValue(true);

    const { result } = renderHook(() => useMlJobSettingsMenuItem());

    expect(result.current.item).toEqual(
      expect.objectContaining({
        id: 'mlJobSettings',
        overflow: true,
        testId: ML_JOB_SETTINGS_MENU_ITEM_TEST_ID,
      })
    );
  });

  it('returns undefined when the user is licensed but not an ML admin', () => {
    mockHasMlLicense.mockReturnValue(true);
    mockHasMlAdminPermissions.mockReturnValue(false);

    const { result } = renderHook(() => useMlJobSettingsMenuItem());

    expect(result.current.item).toBeUndefined();
    expect(result.current.flyout).toBeNull();
  });

  it('calls returnFocus when the flyout closes', () => {
    mockHasMlLicense.mockReturnValue(false);
    mockHasMlAdminPermissions.mockReturnValue(false);
    const returnFocus = jest.fn();

    const { result } = renderHook(() => useMlJobSettingsMenuItem());

    act(() => {
      result.current.item?.run?.({
        triggerElement: document.createElement('button'),
        returnFocus,
      });
    });

    render(<>{result.current.flyout}</>);
    fireEvent.click(screen.getByTestId('ml-settings-flyout-close'));

    expect(returnFocus).toHaveBeenCalledTimes(1);
  });
});
