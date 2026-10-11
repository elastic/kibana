/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, within, type RenderResult } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import {
  DefaultPolicyNotificationMessage,
  policyFactoryWithSupportedFeatures,
} from '../../../../../../../common/endpoint/models/policy_config';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../mocks';
import { useGetProtectionsUnavailableComponent as _useGetProtectionsUnavailableComponent } from '../hooks/use_get_protections_unavailable_component';
import type { PerOsRansomwareProtectionCardProps } from './per_os_ransomware_protection_card';
import {
  LOCKED_CARD_RANSOMWARE_TITLE,
  PerOsRansomwareProtectionCard,
} from './per_os_ransomware_protection_card';
import { selectOsControlOption } from './select_os_control_option.test.helpers';

jest.mock('../../../../../../common/hooks/use_license');
jest.mock('../hooks/use_get_protections_unavailable_component');

jest.setTimeout(15_000); // Costly: each case drives several popover cycles

const useLicenseMock = _useLicense as jest.Mock;
const useGetProtectionsUnavailableComponentMock =
  _useGetProtectionsUnavailableComponent as jest.Mock;

describe('PerOsRansomwareProtectionCard', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').perOsRansomware;
  let policy: PolicyConfig;
  let props: PerOsRansomwareProtectionCardProps;
  let mockedContext: AppContextTestRender;
  let renderResult: RenderResult;

  const render = () => {
    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard {...props} policy={policy} />
    );
    return renderResult;
  };
  const rerender = (nextPolicy: PolicyConfig) => {
    renderResult.rerender(<PerOsRansomwareProtectionCard {...props} policy={nextPolicy} />);
  };
  const getUpdatedPolicy = (): PolicyConfig => {
    const onChange = props.onChange as jest.Mock;
    return onChange.mock.calls[onChange.mock.calls.length - 1][0].updatedPolicy;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedContext.setExperimentalFlag({ linuxRansomwareProtection: true });
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    props = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    useGetProtectionsUnavailableComponentMock.mockReturnValue(null);
  });

  it('renders Windows, Mac and Linux rows when linuxRansomwareProtection is enabled', () => {
    render();

    expect(renderResult.getByTestId(testSubj.windows.row)).toHaveTextContent('Windows');
    expect(renderResult.getByTestId(testSubj.mac.row)).toHaveTextContent('Mac');
    expect(renderResult.getByTestId(testSubj.linux.row)).toHaveTextContent('Linux');
    expect(
      renderResult.container.querySelectorAll(
        `[data-test-subj="${testSubj.windows.row}"], [data-test-subj="${testSubj.mac.row}"], [data-test-subj="${testSubj.linux.row}"]`
      )
    ).toHaveLength(3);
  });

  it('toggling the Linux notification writes only linux.popup.ransomware', async () => {
    policy.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };
    policy.linux.popup.ransomware = { enabled: true, message: '' };
    const windowsBefore = cloneDeep(policy.windows);
    const macBefore = cloneDeep(policy.mac);
    render();

    const notifyCheckbox = renderResult.getByTestId(testSubj.linux.notifyUserCheckbox);
    expect(notifyCheckbox).toBeChecked();
    await userEvent.click(notifyCheckbox);

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.linux.popup.ransomware?.enabled).toBe(false);
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.mac).toEqual(macBefore);
  });

  it('a policy lacking linux.ransomware renders the Linux row as off', () => {
    delete policy.linux.ransomware;
    render();

    expect(renderResult.getByTestId(testSubj.linux.modeSelect)).toHaveTextContent(/^Disable$/);
  });

  it('changing the Linux mode writes linux.ransomware.mode and syncs the Linux notification', async () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.off;
    policy.linux.ransomware = { mode: ProtectionModes.off, supported: true };
    policy.linux.popup.ransomware = { enabled: false, message: 'keep me' };
    render();

    await selectOsControlOption(renderResult, testSubj.linux.modeSelect, /^Detect & prevent$/);

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: true,
    });
    expect(updatedPolicy.linux.popup.ransomware).toEqual({ enabled: true, message: 'keep me' });
  });

  it('seeds supported per license and a complete notification when the Linux ransomware branches were absent', async () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.off;
    delete policy.linux.ransomware;
    delete policy.linux.popup.ransomware;
    render();

    await selectOsControlOption(renderResult, testSubj.linux.modeSelect, /^Detect$/);

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.linux.ransomware).toEqual({
      mode: ProtectionModes.detect,
      supported: policyFactoryWithSupportedFeatures().linux.ransomware?.supported,
    });
    expect(updatedPolicy.linux.popup.ransomware).toEqual({
      enabled: false,
      message: DefaultPolicyNotificationMessage,
    });
  });

  it('the master toggle turns Linux on/off together with Windows and macOS when the flag is on', async () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.off;
    policy.linux.ransomware = { mode: ProtectionModes.off, supported: true };
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.ransomware.mode).toBe(ProtectionModes.prevent);
    expect(updatedPolicy.mac.ransomware.mode).toBe(ProtectionModes.prevent);
    expect(updatedPolicy.linux.ransomware?.mode).toBe(ProtectionModes.prevent);
    expect(updatedPolicy.linux.popup.ransomware?.enabled).toBe(true);
  });

  describe('and linuxRansomwareProtection is disabled', () => {
    beforeEach(() => {
      mockedContext.setExperimentalFlag({ linuxRansomwareProtection: false });
    });

    it('renders exactly Windows and Mac rows and no Linux row', () => {
      render();

      expect(renderResult.getByTestId(testSubj.windows.row)).toHaveTextContent('Windows');
      expect(renderResult.getByTestId(testSubj.mac.row)).toHaveTextContent('Mac');
      expect(renderResult.queryByText('Linux')).not.toBeInTheDocument();
      expect(
        renderResult.container.querySelectorAll(
          `[data-test-subj="${testSubj.windows.row}"], [data-test-subj="${testSubj.mac.row}"]`
        )
      ).toHaveLength(2);
    });

    it('the master toggle leaves an existing linux.ransomware branch untouched', async () => {
      policy.windows.ransomware.mode = ProtectionModes.off;
      policy.mac.ransomware.mode = ProtectionModes.off;
      policy.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };
      const linuxBefore = cloneDeep(policy.linux);
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

      const updatedPolicy = getUpdatedPolicy();
      expect(updatedPolicy.windows.ransomware.mode).toBe(ProtectionModes.prevent);
      expect(updatedPolicy.linux).toEqual(linuxBefore);
    });

    it('the master toggle leaves absent Linux ransomware branches absent', async () => {
      policy.windows.ransomware.mode = ProtectionModes.off;
      policy.mac.ransomware.mode = ProtectionModes.off;
      delete policy.linux.ransomware;
      delete policy.linux.popup.ransomware;
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

      const updatedPolicy = getUpdatedPolicy();
      expect(updatedPolicy.windows.ransomware.mode).toBe(ProtectionModes.prevent);
      expect(updatedPolicy.linux.ransomware).toBeUndefined();
      expect(updatedPolicy.linux.popup.ransomware).toBeUndefined();
    });
  });

  it("reads each row's mode from its own OS branch", () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.detect;
    render();

    expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Disable$/);
    expect(renderResult.getByTestId(testSubj.mac.modeSelect)).toHaveTextContent(/^Detect$/);
  });

  it('a row at Disable renders its mode dropdown and no notify panel', () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.detect;
    render();

    const windowsRow = within(renderResult.getByTestId(testSubj.windows.row));
    expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Disable$/);
    expect(windowsRow.queryByText('Notify user')).not.toBeInTheDocument();
  });

  it('with Windows at Disable and macOS at Detect, macOS still shows all its controls', () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.detect;
    policy.mac.popup.ransomware.enabled = true;
    render();

    expect(renderResult.getByTestId(testSubj.mac.notifyUserCheckbox)).toBeEnabled();
    expect(renderResult.getByTestId(testSubj.mac.notifyCustomMessage)).toBeInTheDocument();
  });

  it('Disable leaves stored notify values; Detect sets popup.enabled false and Prevent sets it true', async () => {
    policy.windows.ransomware.mode = ProtectionModes.detect;
    policy.windows.popup.ransomware.enabled = true;
    policy.windows.popup.ransomware.message = 'keep me';
    const windowsBefore = cloneDeep(policy.windows);
    render();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Disable$/);
    const afterDisable = getUpdatedPolicy();
    expect(afterDisable.windows.ransomware.mode).toBe(ProtectionModes.off);
    expect(afterDisable.windows.popup.ransomware.enabled).toBe(true);
    expect(afterDisable.windows.popup.ransomware.message).toBe('keep me');
    expect({
      ...afterDisable.windows,
      ransomware: {
        ...afterDisable.windows.ransomware,
        mode: windowsBefore.ransomware.mode,
      },
    }).toEqual(windowsBefore);

    rerender(afterDisable);
    expect(renderResult.queryByTestId(testSubj.windows.notifyUserCheckbox)).not.toBeInTheDocument();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect$/);
    const afterDetect = getUpdatedPolicy();
    expect(afterDetect.windows.ransomware.mode).toBe(ProtectionModes.detect);
    expect(afterDetect.windows.popup.ransomware.enabled).toBe(false);
    expect(afterDetect.windows.popup.ransomware.message).toBe('keep me');

    rerender(afterDetect);
    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect & prevent$/);
    const afterPrevent = getUpdatedPolicy();
    expect(afterPrevent.windows.ransomware.mode).toBe(ProtectionModes.prevent);
    expect(afterPrevent.windows.popup.ransomware.enabled).toBe(true);
    expect(afterPrevent.windows.popup.ransomware.message).toBe('keep me');
  });

  it('changing the macOS mode or notification leaves Windows and Linux byte-identical', async () => {
    policy.mac.ransomware.mode = ProtectionModes.prevent;
    policy.mac.popup.ransomware.enabled = true;
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    const supportedBefore = policy.mac.ransomware.supported;
    render();

    await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Detect$/);
    const afterMode = getUpdatedPolicy();
    expect(afterMode.mac.ransomware.mode).toBe(ProtectionModes.detect);
    expect(afterMode.mac.popup.ransomware.enabled).toBe(false);
    expect(afterMode.mac.ransomware.supported).toBe(supportedBefore);
    expect(afterMode.windows).toEqual(windowsBefore);
    expect(afterMode.linux).toEqual(linuxBefore);

    (props.onChange as jest.Mock).mockClear();
    rerender(afterMode);
    fireEvent.change(renderResult.getByTestId(testSubj.mac.notifyCustomMessage), {
      target: { value: 'Mac notification' },
    });
    const afterMessage = getUpdatedPolicy();
    expect(afterMessage.mac.popup.ransomware.message).toBe('Mac notification');
    expect(afterMessage.mac.ransomware.supported).toBe(supportedBefore);
    expect(afterMessage.windows).toEqual(windowsBefore);
    expect(afterMessage.linux).toEqual(linuxBefore);

    (props.onChange as jest.Mock).mockClear();
    rerender(afterMessage);
    await userEvent.click(renderResult.getByTestId(testSubj.mac.notifyUserCheckbox));
    const afterNotify = getUpdatedPolicy();
    expect(afterNotify.mac.popup.ransomware.enabled).toBe(true);
    expect(afterNotify.mac.ransomware.supported).toBe(supportedBefore);
    expect(afterNotify.windows).toEqual(windowsBefore);
    expect(afterNotify.linux).toEqual(linuxBefore);
  });

  it('typing a Linux custom notification message changes only the Linux popup message', () => {
    mockedContext.setExperimentalFlag({ linuxRansomwareProtection: true });
    policy.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };
    policy.linux.popup.ransomware = { message: '', enabled: true };
    const windowsBefore = cloneDeep(policy.windows);
    const macBefore = cloneDeep(policy.mac);
    const linuxRansomwareBefore = cloneDeep(policy.linux.ransomware);
    render();

    fireEvent.change(renderResult.getByTestId(testSubj.linux.notifyCustomMessage), {
      target: { value: 'Linux notification' },
    });

    const updated = getUpdatedPolicy();
    expect(updated.linux.popup.ransomware).toEqual({
      message: 'Linux notification',
      enabled: true,
    });
    expect(updated.linux.ransomware).toEqual(linuxRansomwareBefore);
    expect(updated.windows).toEqual(windowsBefore);
    expect(updated.mac).toEqual(macBefore);
  });

  it('reads the master toggle as on when Windows is off and Mac is prevent', () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.prevent;
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('renders the locked card below Platinum', () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    useLicenseMock.mockReturnValue(licenseServiceMock);
    render();

    expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
      LOCKED_CARD_RANSOMWARE_TITLE
    );
  });

  it('returns null when protections are unavailable', () => {
    useGetProtectionsUnavailableComponentMock.mockReturnValue(() => <div />);

    expect(render().container).toBeEmptyDOMElement();
  });

  describe('and displayed in View Mode', () => {
    beforeEach(() => {
      props.mode = 'view';
    });

    it('should render in view mode', () => {
      policy.windows.ransomware.mode = ProtectionModes.prevent;
      policy.mac.ransomware.mode = ProtectionModes.prevent;
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
    });

    it('should show the stored protection mode', () => {
      policy.windows.ransomware.mode = ProtectionModes.detect;
      render();

      expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Detect$/);
    });
  });
});
