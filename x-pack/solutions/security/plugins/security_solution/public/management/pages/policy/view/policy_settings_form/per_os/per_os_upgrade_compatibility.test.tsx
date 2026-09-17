/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * A policy stored before the macOS ransomware row existed must display the value it holds,
 * not a factory default. macOS ransomware defaults to `off` and Windows to `prevent`, so a
 * row reading the wrong branch would silently misreport the customer's setting.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { getPolicySettingsFormTestSubjects } from '../mocks';
import { useGetProtectionsUnavailableComponent as _useGetProtectionsUnavailableComponent } from '../hooks/use_get_protections_unavailable_component';
import { PerOsRansomwareProtectionCard } from './per_os_ransomware_protection_card';
import { selectOsControlOption } from './select_os_control_option.test.helpers';

jest.mock('../../../../../../common/hooks/use_license');
jest.mock('../hooks/use_get_protections_unavailable_component');

jest.setTimeout(15_000); // Costly: each case drives several popover cycles

const useLicenseMock = _useLicense as jest.Mock;
const useGetProtectionsUnavailableComponentMock =
  _useGetProtectionsUnavailableComponent as jest.Mock;

describe('per-OS form upgrade compatibility with 9.4 policies', () => {
  const testSubjects = getPolicySettingsFormTestSubjects('test');
  let policy: PolicyConfig;
  let mockedContext: AppContextTestRender;
  let renderResult: RenderResult;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    useGetProtectionsUnavailableComponentMock.mockReturnValue(null);
  });

  // `mac.ransomware.mode` was previously only settable through the advanced text field.
  it('shows a macOS ransomware mode set via the 9.4 advanced field in the macOS row', () => {
    policy.mac.ransomware.mode = ProtectionModes.prevent;
    policy.windows.ransomware.mode = ProtectionModes.off;

    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard
        policy={policy}
        onChange={jest.fn()}
        mode="edit"
        data-test-subj={testSubjects.perOsRansomware.card}
      />
    );

    expect(renderResult.getByTestId(testSubjects.perOsRansomware.mac.modeSelect)).toHaveTextContent(
      /^Detect & prevent$/
    );
    expect(
      renderResult.getByTestId(testSubjects.perOsRansomware.windows.modeSelect)
    ).toHaveTextContent(/^Disable$/);
  });

  // A missing macOS ransomware mode must not check the master switch while both rows read Disable.
  it('leaves the master switch unchecked when Windows ransomware is off and macOS mode is missing', () => {
    policy.windows.ransomware.mode = ProtectionModes.off;
    // @ts-expect-error reproducing a policy stored without the field
    delete policy.mac.ransomware.mode;

    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard
        policy={policy}
        onChange={jest.fn()}
        mode="edit"
        data-test-subj={testSubjects.perOsRansomware.card}
      />
    );

    expect(
      renderResult.getByTestId(testSubjects.perOsRansomware.enableDisableSwitch)
    ).toHaveAttribute('aria-checked', 'false');
    expect(
      renderResult.getByTestId(testSubjects.perOsRansomware.windows.modeSelect)
    ).toHaveTextContent(/^Disable$/);
    expect(renderResult.getByTestId(testSubjects.perOsRansomware.mac.modeSelect)).toHaveTextContent(
      /^Disable$/
    );
  });

  // The advanced text field could delete the key while leaving `supported` behind. Falling
  // back to Windows' default here would show macOS ransomware as on.
  it('shows Disable for a 9.4 policy whose macOS ransomware mode was cleared', () => {
    // @ts-expect-error reproducing a policy stored without the field
    delete policy.mac.ransomware.mode;

    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard
        policy={policy}
        onChange={jest.fn()}
        mode="edit"
        data-test-subj={testSubjects.perOsRansomware.card}
      />
    );

    expect(renderResult.getByTestId(testSubjects.perOsRansomware.mac.modeSelect)).toHaveTextContent(
      /^Disable$/
    );
  });

  // A policy stored before macOS ransomware existed has no `ransomware` object at all, which the
  // server-side feature-usage path already tolerates. Rendering must survive it too, and setting a
  // mode has to create the branch rather than throw.
  it('renders and writes a mode when the whole macOS ransomware branch is absent', async () => {
    const onChange = jest.fn();
    // Windows must be off, otherwise the master toggle short-circuits on it and never reads mac.
    policy.windows.ransomware.mode = ProtectionModes.off;
    // @ts-expect-error reproducing a policy stored before the branch existed
    delete policy.mac.ransomware;

    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard
        policy={policy}
        onChange={onChange}
        mode="edit"
        data-test-subj={testSubjects.perOsRansomware.card}
      />
    );

    expect(renderResult.getByTestId(testSubjects.perOsRansomware.mac.modeSelect)).toHaveTextContent(
      /^Disable$/
    );

    await selectOsControlOption(
      renderResult,
      testSubjects.perOsRansomware.mac.modeSelect,
      /^Detect$/
    );

    const { updatedPolicy } = onChange.mock.calls.at(-1)![0];
    expect(updatedPolicy.mac.ransomware.mode).toBe(ProtectionModes.detect);
  });
  // The mode can be active while the notification branch is absent, since 9.4 exposed the mode
  // through the advanced field without touching `popup`.
  it('renders the notification controls when the macOS ransomware popup branch is absent', async () => {
    const onChange = jest.fn();
    policy.mac.ransomware.mode = ProtectionModes.prevent;
    // @ts-expect-error reproducing a policy whose notification branch was never written
    delete policy.mac.popup.ransomware;

    renderResult = mockedContext.render(
      <PerOsRansomwareProtectionCard
        policy={policy}
        onChange={onChange}
        mode="edit"
        data-test-subj={testSubjects.perOsRansomware.card}
      />
    );

    const notifyCheckbox = renderResult.getByTestId(
      testSubjects.perOsRansomware.mac.notifyUserCheckbox
    );
    expect(notifyCheckbox).not.toBeChecked();

    await userEvent.click(notifyCheckbox);

    const { updatedPolicy } = onChange.mock.calls.at(-1)![0];
    expect(updatedPolicy.mac.popup.ransomware).toEqual({ enabled: true, message: '' });
  });
});
