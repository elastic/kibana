/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS } from '../../../../../../../common/endpoint/service/policy/custom_yara_signatures';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { AntivirusRegistrationModes } from '../../../../../../../common/endpoint/types';
import {
  expectIsViewOnly,
  getPolicySettingsFormTestSubjects,
  setAntivirusRegistration,
  setMalwareModeToDetect,
} from '../mocks';
import { useGetProtectionsUnavailableComponent as _useGetProtectionsUnavailableComponent } from '../hooks/use_get_protections_unavailable_component';
import { useGetDeviceControlUpsellComponent as _useGetDeviceControlUpsellComponent } from '../hooks/use_get_device_control_component';
import type { PerOsPolicySettingsFormProps } from './per_os_policy_settings_form';
import { PerOsPolicySettingsForm } from './per_os_policy_settings_form';
import { selectOsControlOption } from './select_os_control_option.test.helpers';

jest.mock('../../../../../../common/hooks/use_license');
jest.mock('../hooks/use_get_protections_unavailable_component');
jest.mock('../hooks/use_get_device_control_component');

jest.setTimeout(15_000); // Costly: each case drives several popover cycles

const useLicenseMock = _useLicense as jest.Mock;
const useGetProtectionsUnavailableComponentMock =
  _useGetProtectionsUnavailableComponent as jest.Mock;
const useGetDeviceControlUpsellComponentMock = _useGetDeviceControlUpsellComponent as jest.Mock;

describe('PerOsPolicySettingsForm', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test');
  const omittedAdvancedKey = 'mac.ransomware.mode';
  const neighbouringMacAdvancedKey = 'mac.advanced.ransomware.diagnostic';

  let formProps: PerOsPolicySettingsFormProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let storageMock: IStorageWrapper;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    storageMock = mockedContext.startServices.storage;
    // trustedDevices is on by default in experimental features; keep it off unless a
    // test is exercising the device-control gate so card presence stays stable.
    mockedContext.setExperimentalFlag({ linuxDnsEvents: true, trustedDevices: false });

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
    };

    storageMock.set('securitySolution.showEventMergingBanner', false);
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    useGetProtectionsUnavailableComponentMock.mockReturnValue(null);
    useGetDeviceControlUpsellComponentMock.mockReturnValue(null);

    render = () =>
      (renderResult = mockedContext.render(<PerOsPolicySettingsForm {...formProps} />));
  });

  it.each([
    ['malware', testSubj.perOsMalware.card],
    ['malicious behaviour', testSubj.perOsBehaviour.card],
    ['antivirus registration', testSubj.perOsAntivirusRegistration.card],
    ['ransomware', testSubj.perOsRansomware.card],
    ['memory', testSubj.perOsMemory.card],
    ['attack surface', testSubj.perOsAttackSurface.card],
    ['event collection', testSubj.perOsEventCollection.card],
    ['advanced settings', testSubj.advancedSection.container],
  ])('includes the %s card', (_, testSubjSelector) => {
    render();

    expect(renderResult.getByTestId(testSubjSelector)).toBeInTheDocument();
  });

  describe('and when policy protections are not available', () => {
    beforeEach(() => {
      useGetProtectionsUnavailableComponentMock.mockReturnValue(() => (
        <div data-test-subj="paywall">{'pay up!'}</div>
      ));
    });

    it.each([
      ['malware', testSubj.perOsMalware.card],
      ['malicious behaviour', testSubj.perOsBehaviour.card],
      ['antivirus registration', testSubj.perOsAntivirusRegistration.card],
      ['ransomware', testSubj.perOsRansomware.card],
      ['memory', testSubj.perOsMemory.card],
      ['attack surface', testSubj.perOsAttackSurface.card],
    ])('hides the %s card', (_, testSubjSelector) => {
      render();

      expect(renderResult.queryByTestId(testSubjSelector)).not.toBeInTheDocument();
    });

    it('shows the upsell and keeps the non-protection cards', () => {
      // The protection cards sit in two conditional blocks with Antivirus solution between
      // them, so a mistake in that split would take Event collection or the advanced
      // settings down with the protections.
      render();

      expect(renderResult.getByTestId('paywall')).toBeInTheDocument();
      expect(renderResult.getByTestId(testSubj.perOsEventCollection.card)).toBeInTheDocument();
      expect(renderResult.getByTestId(testSubj.advancedSection.container)).toBeInTheDocument();
    });
  });

  describe('antivirus-registration sync proxy', () => {
    const changeWindowsMalwareMode = async (optionName: RegExp) => {
      await selectOsControlOption(
        renderResult,
        testSubj.perOsMalware.windows.modeSelect,
        optionName
      );
    };

    const getUpdatedPolicy = () =>
      (formProps.onChange as jest.Mock).mock.calls.at(-1)[0].updatedPolicy;

    it('syncs antivirus registration with Windows malware when the AV mode is sync', async () => {
      setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, true);
      render();

      await changeWindowsMalwareMode(/^Detect$/);

      expect(getUpdatedPolicy().windows.antivirus_registration.enabled).toBe(false);
    });

    it('enables antivirus registration when Windows malware is set back to prevent under sync', async () => {
      setMalwareModeToDetect(formProps.policy);
      setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, false);
      render();

      await changeWindowsMalwareMode(/^Detect & prevent$/);

      expect(getUpdatedPolicy().windows.antivirus_registration.enabled).toBe(true);
    });

    it('does not disable antivirus registration when the AV mode is forced on', async () => {
      setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.enabled, true);
      render();

      await changeWindowsMalwareMode(/^Detect$/);

      expect(getUpdatedPolicy().windows.antivirus_registration.enabled).toBe(true);
    });
  });

  describe('advanced-settings omission', () => {
    it('omits mac.ransomware.mode while still showing neighbouring mac advanced rows', async () => {
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.advancedSection.showHideButton));

      expect(
        renderResult.queryByTestId(
          testSubj.advancedSection.settingRowTestSubjects(omittedAdvancedKey).container
        )
      ).not.toBeInTheDocument();
      expect(
        renderResult.getByTestId(
          testSubj.advancedSection.settingRowTestSubjects(neighbouringMacAdvancedKey).container
        )
      ).toBeInTheDocument();
    }, 15_000);
  });

  describe('custom YARA signatures advanced settings', () => {
    const renderAndShowAdvancedSettings = async () => {
      render();
      await userEvent.click(renderResult.getByTestId(testSubj.advancedSection.showHideButton));
    };
    const queryAdvancedSettingRow = (key: string) =>
      renderResult.queryByTestId(testSubj.advancedSection.settingRowTestSubjects(key).container);

    it('hides the custom YARA rescan interval rows when the experimental flag is off', async () => {
      await renderAndShowAdvancedSettings();

      for (const key of CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS) {
        expect(queryAdvancedSettingRow(key)).toBeNull();
      }
    });

    describe('and the custom YARA signatures experimental flag is enabled', () => {
      beforeEach(() => {
        mockedContext.setExperimentalFlag({
          linuxDnsEvents: true,
          trustedDevices: false,
          customYaraSignaturesEnabled: true,
        });
      });

      it('shows the custom YARA rescan interval row for every OS', async () => {
        await renderAndShowAdvancedSettings();

        for (const key of CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS) {
          expect(queryAdvancedSettingRow(key)).toBeInTheDocument();
        }
      });

      it('hides the custom YARA rescan interval rows when the license is lower than Enterprise', async () => {
        const licenseServiceMock = createLicenseServiceMock();
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        useLicenseMock.mockReturnValue(licenseServiceMock);
        await renderAndShowAdvancedSettings();

        for (const key of CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS) {
          expect(queryAdvancedSettingRow(key)).toBeNull();
        }
      });

      it('hides the custom YARA rescan interval rows when a serverless PLI upsell message is present', async () => {
        mockedContext.startServices.upselling.setMessages({
          endpoint_custom_yara_signatures:
            'To apply custom YARA signatures, you must add Endpoint Complete to your project.',
        });
        await renderAndShowAdvancedSettings();

        for (const key of CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS) {
          expect(queryAdvancedSettingRow(key)).toBeNull();
        }
      });
    });
  });

  describe('event merging banner', () => {
    it('shows the banner when the storage key is unset', () => {
      storageMock.remove('securitySolution.showEventMergingBanner');
      render();

      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();
    });

    it('shows the banner when the storage key is true', () => {
      storageMock.set('securitySolution.showEventMergingBanner', true);
      render();

      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();
    });

    it('hides the banner after dismissal and persists false to storage', async () => {
      storageMock.set('securitySolution.showEventMergingBanner', true);
      render();
      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();

      await userEvent.click(renderResult.getByTestId('euiDismissCalloutButton'));

      expect(renderResult.queryByTestId('eventMergingCallout')).not.toBeInTheDocument();
      expect(storageMock.get('securitySolution.showEventMergingBanner')).toBe(false);
    });

    it('does not show the banner when it was previously dismissed', () => {
      storageMock.set('securitySolution.showEventMergingBanner', false);
      render();

      expect(renderResult.queryByTestId('eventMergingCallout')).not.toBeInTheDocument();
    });
  });

  describe('trustedDevices gate', () => {
    it('does not render the device-control section when trustedDevices is off', () => {
      mockedContext.setExperimentalFlag({ linuxDnsEvents: true, trustedDevices: false });
      render();

      expect(renderResult.queryByTestId(testSubj.perOsDeviceControl.card)).not.toBeInTheDocument();
      expect(
        renderResult.queryByTestId(testSubj.perOsDeviceControl.lockedCard)
      ).not.toBeInTheDocument();
    });

    it('renders the device-control section when trustedDevices is on', () => {
      mockedContext.setExperimentalFlag({ linuxDnsEvents: true, trustedDevices: true });
      render();

      expect(renderResult.getByTestId(testSubj.perOsDeviceControl.card)).toBeInTheDocument();
    });
  });

  it('renders in view mode', () => {
    formProps.mode = 'view';
    render();

    expectIsViewOnly(renderResult.getByTestId(testSubj.form));
  });
});
