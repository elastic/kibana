/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { expectIsViewOnly } from '../mocks';
import { createMalwarePolicyAccessor } from './policy_accessor';
import type { PerOsNotifyUserOptionProps } from './per_os_notify_user_option';
import { PerOsNotifyUserOption } from './per_os_notify_user_option';

jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('PerOsNotifyUserOption', () => {
  let policy: PolicyConfig;
  let onChange: jest.Mock;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let hasRendered: boolean;

  const render = (mode: 'edit' | 'view' = 'edit', policyToRender: PolicyConfig = policy) => {
    const props: PerOsNotifyUserOptionProps<'malware', 'mac'> = {
      accessor: createMalwarePolicyAccessor(policyToRender, 'mac'),
      onChange,
      mode,
      protection: 'malware',
      'data-test-subj': 'test',
    };
    const component = <PerOsNotifyUserOption {...props} />;
    if (hasRendered) {
      renderResult.rerender(component);
    } else {
      renderResult = mockedContext.render(component);
      hasRendered = true;
    }
    return renderResult;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    hasRendered = false;
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    onChange = jest.fn();
    policy.windows.popup.malware.enabled = false;
    policy.windows.popup.malware.message = 'windows message';
    policy.windows.malware.mode = ProtectionModes.off;
    policy.mac.popup.malware.enabled = true;
    policy.mac.popup.malware.message = 'mac message';
    policy.mac.malware.mode = ProtectionModes.prevent;
    policy.linux.popup.malware.enabled = false;
    policy.linux.popup.malware.message = 'linux message';
    policy.linux.malware.mode = ProtectionModes.off;
  });

  it('reads the bound OS notification state, message, and protection mode', () => {
    render();

    expect(renderResult.getByTestId('test-checkbox')).toBeChecked();
    expect(renderResult.getByTestId('test-checkbox')).toBeEnabled();
    expect(renderResult.getByTestId('test-customMessage')).toHaveValue('mac message');
    expect(renderResult.getByRole('textbox', { name: 'Customize message' })).toBeInTheDocument();
  });

  it('renders the message input in checked and unchecked states and disables it when unchecked', () => {
    render();
    expect(renderResult.getByTestId('test-customMessage')).toBeEnabled();

    policy.mac.popup.malware.enabled = false;
    render();

    expect(renderResult.getByRole('textbox', { name: 'Customize message' })).toBeInTheDocument();
    expect(renderResult.getByTestId('test-customMessage')).toBeDisabled();
    expect(renderResult.getByTestId('test-customMessage')).toHaveValue('mac message');
  });

  it('updates only the bound OS notification state', async () => {
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    await userEvent.click(renderResult.getByTestId('test-checkbox'));

    const updatedPolicy = onChange.mock.calls[0][0].updatedPolicy as PolicyConfig;
    expect(updatedPolicy.mac.popup.malware.enabled).toBe(false);
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('preserves the custom message when notification is unchecked and re-checked', async () => {
    render();

    await userEvent.click(renderResult.getByTestId('test-checkbox'));
    const afterUncheck = onChange.mock.calls[0][0].updatedPolicy as PolicyConfig;
    expect(afterUncheck.mac.popup.malware).toEqual({
      enabled: false,
      message: 'mac message',
    });

    onChange.mockClear();
    render('edit', afterUncheck);
    await userEvent.click(renderResult.getByTestId('test-checkbox'));
    const afterRecheck = onChange.mock.calls[0][0].updatedPolicy as PolicyConfig;
    expect(afterRecheck.mac.popup.malware).toEqual({
      enabled: true,
      message: 'mac message',
    });
  });

  it('updates only the bound OS custom message', () => {
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    fireEvent.change(renderResult.getByRole('textbox', { name: 'Customize message' }), {
      target: { value: 'new mac message' },
    });

    const updatedPolicy = onChange.mock.calls[0][0].updatedPolicy as PolicyConfig;
    expect(updatedPolicy.mac.popup.malware.message).toBe('new mac message');
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('displays and writes a multi-line custom message for the bound OS only', () => {
    const storedMessage = 'line one\nline two';
    const nextMessage = 'first\nsecond\nthird';
    policy.mac.popup.malware.message = storedMessage;
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    const messageField = renderResult.getByRole('textbox', { name: 'Customize message' });
    expect(messageField).toHaveValue(storedMessage);

    fireEvent.change(messageField, { target: { value: nextMessage } });

    const updatedPolicy = onChange.mock.calls[0][0].updatedPolicy as PolicyConfig;
    expect(updatedPolicy.mac.popup.malware.message).toBe(nextMessage);
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('disables the message field when protection mode is off', () => {
    policy.mac.malware.mode = ProtectionModes.off;
    render();

    expect(renderResult.getByTestId('test-customMessage')).toBeDisabled();
    expect(renderResult.getByTestId('test-customMessage')).toHaveValue('mac message');
  });

  it('disables the message field in view mode', () => {
    render('view');

    expectIsViewOnly(renderResult.getByTestId('test'));
    expect(renderResult.getByTestId('test-customMessage')).toHaveValue('mac message');
    expect(renderResult.getByTestId('test-customMessage')).toBeDisabled();
  });

  it('renders nothing below Platinum', () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    useLicenseMock.mockReturnValue(licenseServiceMock);
    render();

    expect(renderResult.container).toBeEmptyDOMElement();
  });
});
