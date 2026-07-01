/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import userEvent from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { OsProtectionModeSelectProps } from './os_protection_mode_select';
import { OsProtectionModeSelect } from './os_protection_mode_select';
import { expectIsViewOnly } from '../mocks';

jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('OsProtectionModeSelect', () => {
  const TEST_SUBJ = 'test-modeSelect';

  let formProps: OsProtectionModeSelectProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  const openDropdown = async () => {
    await userEvent.click(renderResult.getByTestId(TEST_SUBJ));
  };

  const selectOption = async (label: string) => {
    await openDropdown();
    await userEvent.click(renderResult.getByRole('option', { name: label }));
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    formProps = {
      os: 'windows',
      protection: 'malware',
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      sectionFeatureEnabled: true,
      'data-test-subj': TEST_SUBJ,
    };

    render = () => (renderResult = mockedContext.render(<OsProtectionModeSelect {...formProps} />));
  });

  it('renders the mode select for windows OS', () => {
    render();
    expect(renderResult.getByTestId(TEST_SUBJ)).toBeTruthy();
    expect(renderResult.getByRole('button', { name: /windows protection mode/i })).toBeTruthy();
  });

  it('renders the mode select for linux OS', () => {
    formProps.os = 'linux';
    render();
    expect(renderResult.getByTestId(TEST_SUBJ)).toBeTruthy();
    expect(renderResult.getByRole('button', { name: /linux protection mode/i })).toBeTruthy();
  });

  it('shows the current windows policy mode as the selected value', () => {
    set(formProps.policy, 'windows.malware.mode', ProtectionModes.detect);
    render();
    // Detect & prevent is not selected; the button shows "Detect"
    expect(renderResult.getByTestId(TEST_SUBJ)).toHaveTextContent(/detect/i);
  });

  it('is disabled when sectionFeatureEnabled is false', () => {
    formProps.sectionFeatureEnabled = false;
    render();
    expect(renderResult.getByTestId(TEST_SUBJ)).toBeDisabled();
  });

  it('shows displayModeWhenPolicyOff when policy mode is off and snapshot is provided', () => {
    set(formProps.policy, 'windows.malware.mode', ProtectionModes.off);
    formProps.displayModeWhenPolicyOff = ProtectionModes.detect;
    render();
    // Should show "Detect" (the snapshot) even though actual policy is off
    expect(renderResult.getByTestId(TEST_SUBJ)).toHaveTextContent(/detect/i);
  });

  it('shows "Disable" when policy mode is off and no snapshot is provided', () => {
    set(formProps.policy, 'windows.malware.mode', ProtectionModes.off);
    render();
    expect(renderResult.getByTestId(TEST_SUBJ)).toHaveTextContent(/disable/i);
  });

  describe('onChange behaviour per OS', () => {
    it('selecting Detect for windows updates only windows.malware.mode', async () => {
      // Policy starts in prevent; change Windows to detect
      set(formProps.policy, 'windows.malware.mode', ProtectionModes.prevent);
      const expected = cloneDeep(formProps.policy);
      set(expected, 'windows.malware.mode', ProtectionModes.detect);
      set(expected, 'windows.popup.malware.enabled', false);
      render();

      await selectOption('Detect');

      expect(formProps.onChange).toHaveBeenCalledWith({ isValid: true, updatedPolicy: expected });
      // Mac and Linux should be untouched
      const { updatedPolicy } = (formProps.onChange as jest.Mock).mock.calls[0][0];
      expect(updatedPolicy.mac.malware.mode).toBe(formProps.policy.mac.malware.mode);
      expect(updatedPolicy.linux.malware.mode).toBe(formProps.policy.linux.malware.mode);
    });

    it('selecting Detect for mac updates only mac.malware.mode', async () => {
      formProps.os = 'mac';
      set(formProps.policy, 'mac.malware.mode', ProtectionModes.prevent);
      const expected = cloneDeep(formProps.policy);
      set(expected, 'mac.malware.mode', ProtectionModes.detect);
      set(expected, 'mac.popup.malware.enabled', false);
      render();

      await selectOption('Detect');

      expect(formProps.onChange).toHaveBeenCalledWith({ isValid: true, updatedPolicy: expected });
      const { updatedPolicy } = (formProps.onChange as jest.Mock).mock.calls[0][0];
      expect(updatedPolicy.windows.malware.mode).toBe(formProps.policy.windows.malware.mode);
      expect(updatedPolicy.linux.malware.mode).toBe(formProps.policy.linux.malware.mode);
    });

    it('selecting Detect for linux updates only linux.malware.mode', async () => {
      formProps.os = 'linux';
      set(formProps.policy, 'linux.malware.mode', ProtectionModes.prevent);
      const expected = cloneDeep(formProps.policy);
      set(expected, 'linux.malware.mode', ProtectionModes.detect);
      set(expected, 'linux.popup.malware.enabled', false);
      render();

      await selectOption('Detect');

      expect(formProps.onChange).toHaveBeenCalledWith({ isValid: true, updatedPolicy: expected });
      const { updatedPolicy } = (formProps.onChange as jest.Mock).mock.calls[0][0];
      expect(updatedPolicy.windows.malware.mode).toBe(formProps.policy.windows.malware.mode);
      expect(updatedPolicy.mac.malware.mode).toBe(formProps.policy.mac.malware.mode);
    });

    it('selecting Detect & prevent enables popup.malware on platinum license', async () => {
      set(formProps.policy, 'windows.malware.mode', ProtectionModes.detect);
      render();

      await selectOption('Detect & prevent');

      const { updatedPolicy } = (formProps.onChange as jest.Mock).mock.calls[0][0];
      expect(updatedPolicy.windows.malware.mode).toBe(ProtectionModes.prevent);
      expect(updatedPolicy.windows.popup.malware.enabled).toBe(true);
    });

    it('does NOT update popup.malware when license is below platinum', async () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      useLicenseMock.mockReturnValue(licenseServiceMock);

      set(formProps.policy, 'windows.malware.mode', ProtectionModes.detect);
      const expected = cloneDeep(formProps.policy);
      set(expected, 'windows.malware.mode', ProtectionModes.prevent);
      // popup.malware.enabled must not change

      render();
      await selectOption('Detect & prevent');

      expect(formProps.onChange).toHaveBeenCalledWith({ isValid: true, updatedPolicy: expected });

      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });
  });

  describe('and rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('renders the mode as text without an interactive select', () => {
      render();
      expectIsViewOnly(renderResult.container);
      // The trigger button should not be present in view mode
      expect(renderResult.queryByTestId(TEST_SUBJ)).toBeNull();
    });

    it('displays Disable when policy mode is off', () => {
      set(formProps.policy, 'windows.malware.mode', ProtectionModes.off);
      render();
      expect(renderResult.container).toHaveTextContent(/disable/i);
    });
  });
});
