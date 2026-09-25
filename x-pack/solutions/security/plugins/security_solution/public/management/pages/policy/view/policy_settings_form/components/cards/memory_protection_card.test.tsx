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
import { ProtectionModes } from '../../../../../../../../common/endpoint/types';
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import userEvent from '@testing-library/user-event';
import type { MemoryProtectionCardProps } from './memory_protection_card';
import { LOCKED_CARD_MEMORY_TITLE, MemoryProtectionCard } from './memory_protection_card';
import { CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL } from '../shared_translations';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Memory Protections Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').memory;

  let formProps: MemoryProtectionCardProps;
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  const turnMemoryProtectionOff = () => {
    set(formProps.policy, 'windows.memory_protection.mode', ProtectionModes.off);
    set(formProps.policy, 'mac.memory_protection.mode', ProtectionModes.off);
    set(formProps.policy, 'linux.memory_protection.mode', ProtectionModes.off);
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () => (renderResult = mockedContext.render(<MemoryProtectionCard {...formProps} />));
  });

  it('should render the card with expected components', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.enableDisableSwitch));
    expect(getByTestId(testSubj.protectionPreventRadio));
    expect(getByTestId(testSubj.notifyUserCheckbox));
  });

  it('should show supported OS values', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValuesContainer)).toHaveTextContent(
      'Windows, Mac, Linux'
    );
  });

  it('should not render the custom YARA signatures switch when the experimental flag is off', () => {
    render();

    expect(renderResult.queryByTestId(testSubj.customYaraSignatures)).toBeNull();
    expect(renderResult.queryByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)).toBeNull();
  });

  it('should leave custom YARA signatures untouched when memory protection is turned on and the experimental flag is off', async () => {
    turnMemoryProtectionOff();
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    // The server strips a leftover `true` to absent when the flag is off; the client must not
    // pre-emptively clear it to `false`, which the server would otherwise never touch again.
    const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
    expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(true);
    expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
    expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(true);
  });

  describe('and license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not platinum+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        exactMatchText(LOCKED_CARD_MEMORY_TITLE)
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
            'Memory threat' +
            'Operating system' +
            'Windows, Mac, Linux ' +
            'Memory threat protections' +
            'Protection level' +
            'Prevent' +
            'User notification' +
            'Agent version 7.15+' +
            'Notify user' +
            'Notification message' +
            '—'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).toHaveAttribute('checked');
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.memory_protection.mode', ProtectionModes.off);
      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Memory threat' +
            'Operating system' +
            'Windows, Mac, Linux ' +
            'Memory threat protections'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('false');
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.memory_protection.enabled', false);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Memory threat' +
            'Operating system' +
            'Windows, Mac, Linux ' +
            'Memory threat protections' +
            'Protection level' +
            'Prevent' +
            'User notification' +
            'Agent version 7.15+' +
            'Notify user'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).not.toHaveAttribute('checked');
    });
  });

  describe('and custom YARA signatures experimental flag is enabled', () => {
    beforeEach(() => {
      mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: true });
    });

    it('should allow custom YARA signatures to be disabled on windows, mac, and linux', async () => {
      const expectedUpdatedPolicy = cloneDeep(formProps.policy);
      expectedUpdatedPolicy.windows.memory_protection.custom_yara_signatures = false;
      expectedUpdatedPolicy.mac.memory_protection.custom_yara_signatures = false;
      expectedUpdatedPolicy.linux.memory_protection.custom_yara_signatures = false;
      render();

      await userEvent.click(
        renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
      );

      expect(formProps.onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: expectedUpdatedPolicy,
      });
    });

    it('should allow custom YARA signatures to be enabled on windows, mac, and linux', async () => {
      set(formProps.policy, 'windows.memory_protection.custom_yara_signatures', false);
      set(formProps.policy, 'mac.memory_protection.custom_yara_signatures', false);
      set(formProps.policy, 'linux.memory_protection.custom_yara_signatures', false);
      const expectedUpdatedPolicy = cloneDeep(formProps.policy);
      expectedUpdatedPolicy.windows.memory_protection.custom_yara_signatures = true;
      expectedUpdatedPolicy.mac.memory_protection.custom_yara_signatures = true;
      expectedUpdatedPolicy.linux.memory_protection.custom_yara_signatures = true;
      render();

      await userEvent.click(
        renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
      );

      expect(formProps.onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: expectedUpdatedPolicy,
      });
    });

    it('should disable the custom YARA signatures switch when memory protection is off', () => {
      set(formProps.policy, 'windows.memory_protection.mode', ProtectionModes.off);
      render();

      expect(
        renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
      ).toBeDisabled();
    });

    it('should set custom YARA signatures to disabled when memory protection is turned off', async () => {
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

      const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
      expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(false);
      expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
      expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(false);
    });

    it('should set custom YARA signatures to enabled on windows, mac, and linux when memory protection is turned on', async () => {
      turnMemoryProtectionOff();
      set(formProps.policy, 'windows.memory_protection.custom_yara_signatures', false);
      set(formProps.policy, 'mac.memory_protection.custom_yara_signatures', false);
      set(formProps.policy, 'linux.memory_protection.custom_yara_signatures', false);
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

      const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
      expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(true);
      expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
      expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(true);
    });

    it('should render the custom YARA signatures switch as unchecked when the field is absent and enable it on all OSes when toggled on', async () => {
      delete formProps.policy.windows.memory_protection.custom_yara_signatures;
      delete formProps.policy.mac.memory_protection.custom_yara_signatures;
      delete formProps.policy.linux.memory_protection.custom_yara_signatures;
      render();

      expect(
        renderResult
          .getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
          .getAttribute('aria-checked')
      ).toBe('false');

      await userEvent.click(
        renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
      );

      const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
      expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(true);
      expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
      expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(true);
    });

    describe('and license is lower than Enterprise', () => {
      beforeEach(() => {
        const licenseServiceMock = createLicenseServiceMock();
        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(false);

        useLicenseMock.mockReturnValue(licenseServiceMock);
      });

      afterEach(() => {
        useLicenseMock.mockReturnValue(licenseServiceMocked);
      });

      it('should disable the switch and show an Enterprise license upsell tooltip', async () => {
        render();

        expect(
          renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
        ).toBeDisabled();

        await userEvent.hover(renderResult.getByTestId(testSubj.customYaraSignaturesTooltipIcon));

        expect(
          await renderResult.findByText(CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL)
        ).toBeInTheDocument();
      });

      it('should leave custom YARA signatures disabled when memory protection is turned on', async () => {
        turnMemoryProtectionOff();
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
        expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(false);
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
        expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(false);
      });

      it('should keep an absent custom YARA signatures field absent when memory protection is turned on', async () => {
        turnMemoryProtectionOff();
        delete formProps.policy.windows.memory_protection.custom_yara_signatures;
        delete formProps.policy.mac.memory_protection.custom_yara_signatures;
        delete formProps.policy.linux.memory_protection.custom_yara_signatures;
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
        expect(updatedPolicy.windows.memory_protection).not.toHaveProperty(
          'custom_yara_signatures'
        );
        expect(updatedPolicy.mac.memory_protection).not.toHaveProperty('custom_yara_signatures');
        expect(updatedPolicy.linux.memory_protection).not.toHaveProperty('custom_yara_signatures');
      });
    });

    describe('and a serverless PLI upsell message is present', () => {
      const pliUpsellMessage =
        'To apply custom YARA signatures, you must add Endpoint Complete to your project.';

      beforeEach(() => {
        mockedContext.startServices.upselling.setMessages({
          endpoint_custom_yara_signatures: pliUpsellMessage,
        });
      });

      it('should disable the switch and show the PLI upsell tooltip', async () => {
        render();

        expect(
          renderResult.getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)
        ).toBeDisabled();

        await userEvent.hover(renderResult.getByTestId(testSubj.customYaraSignaturesTooltipIcon));

        expect(await renderResult.findByText(pliUpsellMessage)).toBeInTheDocument();
      });

      it('should leave custom YARA signatures untouched when memory protection is turned on', async () => {
        turnMemoryProtectionOff();
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        // Same rationale as the flag-off case: the product-feature gate is absorbed server-side
        // without ever reaching license validation, so the client must leave the field alone.
        const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls[0][0].updatedPolicy;
        expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(true);
      });
    });

    describe('and displayed in View mode', () => {
      beforeEach(() => {
        formProps.mode = 'view';
      });

      it('should render the custom YARA signatures value as read-only', () => {
        const { getByTestId } = render();

        expectIsViewOnly(getByTestId(testSubj.card));
        expect(getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch)).toBeDisabled();
        expect(
          getByTestId(testSubj.customYaraSignaturesEnableDisableSwitch).getAttribute('aria-checked')
        ).toBe('true');
        expect(getByTestId(testSubj.card)).toHaveTextContent('Apply custom YARA signatures');
      });
    });
  });
});
