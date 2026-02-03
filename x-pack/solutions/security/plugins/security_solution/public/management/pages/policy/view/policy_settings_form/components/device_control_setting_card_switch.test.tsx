/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep } from 'lodash';
import userEvent from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import { exactMatchText, expectIsViewOnly } from '../mocks';
import type { DeviceControlSettingCardSwitchProps } from './device_control_setting_card_switch';
import { DeviceControlSettingCardSwitch } from './device_control_setting_card_switch';

const setDeviceControlMode = ({
  policy,
  turnOff = false,
}: {
  policy: PolicyConfig;
  turnOff?: boolean;
}) => {
  const enabled = !turnOff;

  policy.windows.popup = policy.windows.popup ?? {};
  policy.mac.popup = policy.mac.popup ?? {};
  if (!policy.windows.device_control) {
    policy.windows.device_control = {
      enabled: false,
      usb_storage: DeviceControlAccessLevelEnum.audit,
    };
  }
  if (!policy.mac.device_control) {
    policy.mac.device_control = {
      enabled: false,
      usb_storage: DeviceControlAccessLevelEnum.audit,
    };
  }
  const windowsDeviceControl = policy.windows.device_control;
  const macDeviceControl = policy.mac.device_control;

  windowsDeviceControl.enabled = enabled;
  macDeviceControl.enabled = enabled;

  if (enabled) {
    windowsDeviceControl.usb_storage = DeviceControlAccessLevelEnum.deny_all;
    macDeviceControl.usb_storage = DeviceControlAccessLevelEnum.deny_all;
  } else {
    windowsDeviceControl.usb_storage = DeviceControlAccessLevelEnum.audit;
    macDeviceControl.usb_storage = DeviceControlAccessLevelEnum.audit;
  }

  policy.windows.popup.device_control = { enabled, message: '' };
  policy.mac.popup.device_control = { enabled, message: '' };
};

describe('Policy form DeviceControlSettingCardSwitch component', () => {
  let formProps: DeviceControlSettingCardSwitchProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;

    // Ensure device control is enabled by default for tests
    setDeviceControlMode({ policy, turnOff: false });

    formProps = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
      selected: true,
      protectionLabel: 'Device Control',
      osList: ['windows', 'mac'],
    };

    render = () => {
      const selected = formProps.policy.windows.device_control?.enabled ?? false;
      renderResult = mockedContext.render(
        <DeviceControlSettingCardSwitch {...formProps} selected={selected} />
      );
      return renderResult;
    };
  });

  it('should render expected output when enabled', () => {
    const { getByTestId } = render();

    expect(getByTestId('test')).toHaveAttribute('aria-checked', 'true');
    expect(getByTestId('test-label')).toHaveTextContent(exactMatchText('Device Control'));
  });

  it('should render expected output when disabled', () => {
    setDeviceControlMode({ policy: formProps.policy, turnOff: true });
    const { getByTestId } = render();

    expect(getByTestId('test')).toHaveAttribute('aria-checked', 'false');
    expect(getByTestId('test-label')).toHaveTextContent(exactMatchText('Device Control'));
  });

  it('should be able to disable it', async () => {
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    setDeviceControlMode({ policy: expectedUpdatedPolicy, turnOff: true });

    render();
    await userEvent.click(renderResult.getByTestId('test'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  it('should be able to enable it', async () => {
    // Start with it disabled
    setDeviceControlMode({ policy: formProps.policy, turnOff: true });

    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    setDeviceControlMode({ policy: expectedUpdatedPolicy, turnOff: false });

    render();
    await userEvent.click(renderResult.getByTestId('test'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  describe('and rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should not include any enabled form elements', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId('test'));
    });

    it('should show option when checked', () => {
      render();

      expect(renderResult.getByTestId('test-label')).toHaveTextContent(
        exactMatchText('Device Control')
      );
      expect(renderResult.getByTestId('test').getAttribute('aria-checked')).toBe('true');
    });

    it('should show option when unchecked', () => {
      setDeviceControlMode({ policy: formProps.policy, turnOff: true });
      render();

      expect(renderResult.getByTestId('test-label')).toHaveTextContent(
        exactMatchText('Device Control')
      );
      expect(renderResult.getByTestId('test').getAttribute('aria-checked')).toBe('false');
    });

    it('should not be clickable', async () => {
      render();

      await userEvent.click(renderResult.getByTestId('test'));

      expect(formProps.onChange).not.toHaveBeenCalled();
    });
  });
});
