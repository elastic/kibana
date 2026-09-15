/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PerOsProtectionMasterToggleProps } from './per_os_protection_master_toggle';
import { PerOsProtectionMasterToggle } from './per_os_protection_master_toggle';
import { adjustMalwareSubfeatures } from './per_os_malware_protections_card';

jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('PerOsProtectionMasterToggle', () => {
  let policy: PolicyConfig;
  let props: PerOsProtectionMasterToggleProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const render = () => {
    const mockedContext = createAppRootMockRenderer();
    renderResult = mockedContext.render(<PerOsProtectionMasterToggle {...props} />);
    return renderResult;
  };

  const getUpdatedPolicy = (): PolicyConfig =>
    (props.onChange as jest.Mock).mock.calls[0][0].updatedPolicy as PolicyConfig;

  beforeEach(() => {
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    props = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      protection: 'malware',
      protectionLabel: 'Malware protections',
      osList: ['windows', 'mac', 'linux'],
      'data-test-subj': 'test',
    };
  });

  afterEach(() => {
    useLicenseMock.mockReturnValue(licenseServiceMocked);
  });

  it('renders on when Windows is off but macOS is prevent', () => {
    policy.windows.malware.mode = ProtectionModes.off;
    policy.mac.malware.mode = ProtectionModes.prevent;
    policy.linux.malware.mode = ProtectionModes.off;

    render();

    expect(renderResult.getByTestId('test')).toHaveAttribute('aria-checked', 'true');
  });

  it('sets every supported OS to off when toggled off', async () => {
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.malware.mode).toBe(ProtectionModes.off);
    expect(updatedPolicy.mac.malware.mode).toBe(ProtectionModes.off);
    expect(updatedPolicy.linux.malware.mode).toBe(ProtectionModes.off);
  });

  it('sets every supported OS to prevent when toggled on', async () => {
    policy.windows.malware.mode = ProtectionModes.off;
    policy.mac.malware.mode = ProtectionModes.off;
    policy.linux.malware.mode = ProtectionModes.off;
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.malware.mode).toBe(ProtectionModes.prevent);
    expect(updatedPolicy.mac.malware.mode).toBe(ProtectionModes.prevent);
    expect(updatedPolicy.linux.malware.mode).toBe(ProtectionModes.prevent);
  });

  it('writes popup.malware.enabled on every OS when toggled off', async () => {
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.popup.malware.enabled).toBe(false);
    expect(updatedPolicy.mac.popup.malware.enabled).toBe(false);
    expect(updatedPolicy.linux.popup.malware.enabled).toBe(false);
  });

  it('writes popup.ransomware.enabled on Windows and macOS when toggled off', async () => {
    props.protection = 'ransomware';
    props.osList = ['windows', 'mac'];
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.popup.ransomware.enabled).toBe(false);
    expect(updatedPolicy.mac.popup.ransomware.enabled).toBe(false);
  });

  it('writes popup.memory_protection.enabled on every OS when toggled off', async () => {
    props.protection = 'memory_protection';
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.popup.memory_protection.enabled).toBe(false);
    expect(updatedPolicy.mac.popup.memory_protection.enabled).toBe(false);
    expect(updatedPolicy.linux.popup.memory_protection.enabled).toBe(false);
  });

  it('writes only mode and leaves popup untouched below Platinum', async () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    useLicenseMock.mockReturnValue(licenseServiceMock);

    policy.windows.malware.mode = ProtectionModes.prevent;
    policy.mac.malware.mode = ProtectionModes.prevent;
    policy.linux.malware.mode = ProtectionModes.prevent;
    policy.windows.popup.malware.enabled = true;
    policy.mac.popup.malware.enabled = true;
    policy.linux.popup.malware.enabled = true;
    const popupBefore = {
      windows: { ...policy.windows.popup.malware },
      mac: { ...policy.mac.popup.malware },
      linux: { ...policy.linux.popup.malware },
    };
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.malware.mode).toBe(ProtectionModes.off);
    expect(updatedPolicy.mac.malware.mode).toBe(ProtectionModes.off);
    expect(updatedPolicy.linux.malware.mode).toBe(ProtectionModes.off);
    expect(updatedPolicy.windows.popup.malware).toEqual(popupBefore.windows);
    expect(updatedPolicy.mac.popup.malware).toEqual(popupBefore.mac);
    expect(updatedPolicy.linux.popup.malware).toEqual(popupBefore.linux);
  });

  it('invokes the optional side-effect hook once for each supported OS', async () => {
    policy.windows.malware.blocklist = true;
    policy.mac.malware.blocklist = true;
    policy.linux.malware.blocklist = true;
    policy.windows.malware.on_write_scan = true;
    policy.mac.malware.on_write_scan = true;
    policy.linux.malware.on_write_scan = true;
    props.additionalOnOsSwitchChange = jest.fn(adjustMalwareSubfeatures);
    render();

    await userEvent.click(renderResult.getByTestId('test'));

    expect(props.additionalOnOsSwitchChange).toHaveBeenCalledTimes(3);
    expect(props.additionalOnOsSwitchChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ value: false, os: 'windows' })
    );
    expect(props.additionalOnOsSwitchChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ value: false, os: 'mac' })
    );
    expect(props.additionalOnOsSwitchChange).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ value: false, os: 'linux' })
    );
    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.malware.blocklist).toBe(false);
    expect(updatedPolicy.mac.malware.blocklist).toBe(false);
    expect(updatedPolicy.linux.malware.blocklist).toBe(false);
    expect(updatedPolicy.windows.malware.on_write_scan).toBe(false);
    expect(updatedPolicy.mac.malware.on_write_scan).toBe(false);
    expect(updatedPolicy.linux.malware.on_write_scan).toBe(false);
  });
});
