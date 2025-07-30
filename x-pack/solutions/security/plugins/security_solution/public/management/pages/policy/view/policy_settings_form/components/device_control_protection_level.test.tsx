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
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import { expectIsViewOnly } from '../mocks';
import type { DeviceControlProtectionLevelProps } from './device_control_protection_level';
import { DeviceControlProtectionLevel } from './device_control_protection_level';

describe('Policy form DeviceControlProtectionLevel component', () => {
  let formProps: DeviceControlProtectionLevelProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  const clickAccessLevel = async (level: 'audit' | 'block') => {
    await userEvent.click(renderResult.getByTestId(`test-${level}Radio`).querySelector('label')!);
  };

  const isAccessLevelChecked = (level: 'audit' | 'block'): boolean => {
    return renderResult.getByTestId(`test-${level}Radio`)!.querySelector('input')!.checked ?? false;
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;

    // Default to block for tests
    policy.windows.device_control = {
      enabled: true,
      usb_storage: DeviceControlAccessLevelEnum.block,
    };
    policy.mac.device_control = {
      enabled: true,
      usb_storage: DeviceControlAccessLevelEnum.block,
    };

    formProps = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
      osList: ['windows', 'mac'],
    };

    render = () => {
      renderResult = mockedContext.render(<DeviceControlProtectionLevel {...formProps} />);
      return renderResult;
    };
  });

  it('should render expected options', () => {
    const { getByTestId } = render();
    expect(getByTestId('test-execute_onlyRadio'));
    expect(getByTestId('test-read_onlyRadio'));
    expect(getByTestId('test-auditRadio'));
    expect(getByTestId('test-blockRadio'));
  });

  it('should allow audit mode to be selected', async () => {
    const expectedPolicyUpdate = cloneDeep(formProps.policy);
    expectedPolicyUpdate.windows.device_control!.usb_storage = DeviceControlAccessLevelEnum.audit;
    expectedPolicyUpdate.mac.device_control!.usb_storage = DeviceControlAccessLevelEnum.audit;

    render();

    expect(isAccessLevelChecked('block')).toBe(true);

    await clickAccessLevel('audit');

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedPolicyUpdate,
    });
  });

  it('should allow block mode to be selected', async () => {
    formProps.policy.windows.device_control!.usb_storage = DeviceControlAccessLevelEnum.audit;
    formProps.policy.mac.device_control!.usb_storage = DeviceControlAccessLevelEnum.audit;

    const expectedPolicyUpdate = cloneDeep(formProps.policy);
    expectedPolicyUpdate.windows.device_control!.usb_storage = DeviceControlAccessLevelEnum.block;
    expectedPolicyUpdate.mac.device_control!.usb_storage = DeviceControlAccessLevelEnum.block;

    render();

    expect(isAccessLevelChecked('audit')).toBe(true);

    await clickAccessLevel('block');

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedPolicyUpdate,
    });
  });

  describe('and rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should display block', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId('test'));
      expect(renderResult.getByTestId('test')).toHaveTextContent('Block all');
    });

    it('should display audit', () => {
      formProps.policy.windows.device_control!.usb_storage = DeviceControlAccessLevelEnum.audit;
      render();

      expectIsViewOnly(renderResult.getByTestId('test'));
      expect(renderResult.getByTestId('test')).toHaveTextContent('Allow Read and Write');
    });

    it('should not render radio buttons', () => {
      render();

      expect(renderResult.queryByTestId('test-auditRadio')).toBeNull();
      expect(renderResult.queryByTestId('test-blockRadio')).toBeNull();
    });
  });
});
