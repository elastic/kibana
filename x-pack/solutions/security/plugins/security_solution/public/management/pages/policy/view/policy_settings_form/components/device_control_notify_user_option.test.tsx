/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep } from 'lodash';
import userEvent from '@testing-library/user-event';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import type { DeviceControlAccessLevel } from '../../../../../../../common/endpoint/types';
import { expectIsViewOnly, exactMatchText } from '../mocks';
import {
  NOTIFY_USER_SECTION_TITLE,
  NOTIFY_USER_CHECKBOX_LABEL,
  CUSTOMIZE_NOTIFICATION_MESSAGE_LABEL,
} from './shared_translations';
import type { DeviceControlNotifyUserOptionProps } from './device_control_notify_user_option';
import { DeviceControlNotifyUserOption } from './device_control_notify_user_option';

jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy form DeviceControlNotifyUserOption component', () => {
  let formProps: DeviceControlNotifyUserOptionProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  const isChecked = (selector: string): boolean => {
    return (renderResult.getByTestId(selector) as HTMLInputElement).checked;
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;

    // Enable device control and notifications by default
    policy.windows.device_control = { enabled: true, usb_storage: 'deny_all' };
    policy.mac.device_control = { enabled: true, usb_storage: 'deny_all' };
    policy.windows.popup.device_control = { enabled: true, message: 'hello world' };
    policy.mac.popup.device_control = { enabled: true, message: 'hello world' };

    formProps = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = mockedContext.render(<DeviceControlNotifyUserOption {...formProps} />);
      return renderResult;
    };
  });

  it('should render with expected content', () => {
    const { getByTestId } = render();

    expect(getByTestId('test')).toHaveTextContent(NOTIFY_USER_SECTION_TITLE);
    expect(isChecked('test-checkbox')).toBe(true);
    expect(renderResult.getByLabelText(NOTIFY_USER_CHECKBOX_LABEL));
    expect(getByTestId('test-customMessageTitle')).toHaveTextContent(
      exactMatchText(CUSTOMIZE_NOTIFICATION_MESSAGE_LABEL)
    );
    expect(getByTestId('test-customMessage')).toHaveValue('hello world');
  });

  it('should render with options un-checked', () => {
    formProps.policy.windows.popup.device_control!.enabled = false;
    render();

    expect(isChecked('test-checkbox')).toBe(false);
    expect(renderResult.queryByTestId('test-customMessage')).toBeNull();
  });

  it('should render checkbox disabled if device control is OFF', () => {
    formProps.policy.windows.device_control!.enabled = false;
    formProps.policy.mac.device_control!.enabled = false;
    render();

    expect(renderResult.getByTestId('test-checkbox')).toBeDisabled();
  });

  it('should be able to un-check the option', async () => {
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    expectedUpdatedPolicy.windows.popup.device_control!.enabled = false;
    expectedUpdatedPolicy.mac.popup.device_control!.enabled = false;

    render();
    await userEvent.click(renderResult.getByTestId('test-checkbox'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  it('should be able to check the option', async () => {
    formProps.policy.windows.popup.device_control!.enabled = false;
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    expectedUpdatedPolicy.windows.popup.device_control!.enabled = true;
    expectedUpdatedPolicy.mac.popup.device_control!.enabled = true;

    render();
    await userEvent.click(renderResult.getByTestId('test-checkbox'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  it('should be able to change the notification message', async () => {
    const msg = 'a';
    // Set initial value to empty to avoid concatenation
    formProps.policy.windows.popup.device_control!.message = '';
    formProps.policy.mac.popup.device_control!.message = '';
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);

    render();
    const customMessageInput = renderResult.getByTestId('test-customMessage');
    await userEvent.clear(customMessageInput);
    await userEvent.type(customMessageInput, msg);

    expectedUpdatedPolicy.windows.popup.device_control!.message = msg;
    expectedUpdatedPolicy.mac.popup.device_control!.message = msg;

    expect(formProps.onChange).toHaveBeenCalledTimes(1);
    expect(formProps.onChange).toHaveBeenLastCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  describe('and access level is not deny_all', () => {
    it.each<[DeviceControlAccessLevel, string]>([
      ['audit', 'Allow read, write and execute'],
      ['read_only', 'Read only'],
      ['no_execute', 'Read and write'],
    ])('should NOT render when access level is %s (%s)', (accessLevel) => {
      formProps.policy.windows.device_control!.usb_storage = accessLevel;
      formProps.policy.mac.device_control!.usb_storage = accessLevel;
      render();
      expect(renderResult.queryByTestId('test')).toBeNull();
    });

    it('should render when access level is deny_all (Block all)', () => {
      formProps.policy.windows.device_control!.usb_storage = 'deny_all';
      formProps.policy.mac.device_control!.usb_storage = 'deny_all';
      render();
      expect(renderResult.queryByTestId('test')).not.toBeNull();
    });
  });

  describe('and license is lower than enterprise', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isEnterprise.mockReturnValue(false);
      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should NOT render the component', () => {
      render();
      expect(renderResult.queryByTestId('test')).toBeNull();
    });
  });

  describe('and rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render with no form elements', () => {
      render();
      expectIsViewOnly(renderResult.getByTestId('test'));
    });

    it('should render with expected output when checked', () => {
      render();
      expect(renderResult.getByTestId('test')).toHaveTextContent(
        'User notificationNotify userNotification messagehello world'
      );
    });

    it('should render with expected output when checked with empty message', () => {
      formProps.policy.windows.popup.device_control!.message = '';
      render();
      expect(renderResult.getByTestId('test')).toHaveTextContent(
        'User notificationNotify userNotification message—'
      );
    });

    it('should render with expected output when un-checked', () => {
      formProps.policy.windows.popup.device_control!.enabled = false;
      render();
      expect(renderResult.getByTestId('test')).toHaveTextContent('User notificationNotify user');
    });
  });
});
