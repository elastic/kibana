/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects, exactMatchText } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { DeviceControlAccessLevel } from '../../../../../../../../common/endpoint/types';
import { set } from '@kbn/safer-lodash-set';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import type { DeviceControlProps } from './device_control_card';
import { DEVICE_CONTROL_CARD_TITLE, DeviceControlCard } from './device_control_card';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Device Control Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').deviceControl;

  let formProps: DeviceControlProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () => (renderResult = mockedContext.render(<DeviceControlCard {...formProps} />));
  });

  it('should render the card with expected components', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.enableDisableSwitch));
    expect(getByTestId(testSubj.protectionAuditRadio));
    expect(getByTestId(testSubj.notifyUserCheckbox));
  });

  it('should show supported OS values', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValuesContainer)).toHaveTextContent(
      exactMatchText('Windows, Mac')
    );
  });

  describe('and license is lower than Enterprise', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isEnterprise.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not enterprise+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        exactMatchText(DEVICE_CONTROL_CARD_TITLE)
      );
    });
  });

  describe('and displayed in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should display correctly when overall card is enabled', () => {
      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user' +
            'Notification message' +
            '—'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).toHaveAttribute('checked');
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.device_control.enabled', false);
      set(formProps.policy, 'mac.device_control.enabled', false);
      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          ['Type', 'Device Control', 'Operating system', 'Windows, Mac ', 'Device Control'].join('')
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('false');
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.device_control.enabled', false);
      set(formProps.policy, 'mac.popup.device_control.enabled', false);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).not.toHaveAttribute('checked');
    });

    it('should display correctly with block protection level', () => {
      set(
        formProps.policy,
        'windows.device_control.access_level',
        DeviceControlAccessLevel.deny_all
      );
      set(formProps.policy, 'mac.device_control.access_level', DeviceControlAccessLevel.deny_all);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user' +
            'Notification message' +
            '—'
        )
      );
    });

    it.each([
      [DeviceControlAccessLevel.audit, 'Allow read, write and execute'],
      [DeviceControlAccessLevel.read_only, 'Read only'],
      [DeviceControlAccessLevel.no_execute, 'Read and write'],
    ])(
      'should NOT display user notification section when access level is %s',
      (accessLevel, accessLevelLabel) => {
        set(formProps.policy, 'windows.device_control.usb_storage', accessLevel);
        set(formProps.policy, 'mac.device_control.usb_storage', accessLevel);

        const { getByTestId } = render();

        expectIsViewOnly(getByTestId(testSubj.card));

        expect(getByTestId(testSubj.card)).toHaveTextContent(
          exactMatchText(
            `TypeDevice ControlOperating systemWindows, Mac Device ControlUSB storage access level${accessLevelLabel}`
          )
        );
        expect(renderResult.queryByTestId('test-deviceControl-notifyUser')).toBeNull();
      }
    );
  });

  describe('and policy change detection', () => {
    it('should properly handle toggle off and back on to match original policy', () => {
      const originalPolicy = JSON.parse(JSON.stringify(formProps.policy));
      const { getByTestId } = render();
      const deviceControlSwitch = getByTestId(testSubj.enableDisableSwitch);

      // Verify initial state - device control should be enabled
      expect(deviceControlSwitch.getAttribute('aria-checked')).toBe('true');
      expect(formProps.policy.windows.device_control?.enabled).toBe(true);
      expect(formProps.policy.mac.device_control?.enabled).toBe(true);

      // Toggle device control OFF
      deviceControlSwitch.click();

      // Verify onChange was called and device control is disabled
      expect(formProps.onChange).toHaveBeenCalled();
      const offCallArgs = (formProps.onChange as jest.Mock).mock.calls[0][0];
      expect(offCallArgs.updatedPolicy.windows.device_control.enabled).toBe(false);
      expect(offCallArgs.updatedPolicy.mac.device_control.enabled).toBe(false);

      // Update the policy with the disabled state
      formProps.policy = offCallArgs.updatedPolicy;
      formProps.onChange = jest.fn(); // Reset mock

      // Re-render with updated policy
      renderResult.rerender(<DeviceControlCard {...formProps} />);

      // Toggle device control back ON
      getByTestId(testSubj.enableDisableSwitch).click();

      // Verify onChange was called and device control is re-enabled
      expect(formProps.onChange).toHaveBeenCalled();
      const onCallArgs = (formProps.onChange as jest.Mock).mock.calls[0][0];

      // The key assertion: after toggling off and back on, the policy should match the original
      // This ensures the Save Changes button will be properly disabled when reverting changes
      expect(onCallArgs.updatedPolicy.windows.device_control).toEqual(
        originalPolicy.windows.device_control
      );
      expect(onCallArgs.updatedPolicy.mac.device_control).toEqual(
        originalPolicy.mac.device_control
      );
      expect(onCallArgs.updatedPolicy.windows.popup.device_control).toEqual(
        originalPolicy.windows.popup.device_control
      );
      expect(onCallArgs.updatedPolicy.mac.popup.device_control).toEqual(
        originalPolicy.mac.popup.device_control
      );
    });
  });
});
