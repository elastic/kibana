/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import type { AttackSurfaceReductionCardProps } from './attack_surface_reduction_card';
import {
  AttackSurfaceReductionCard,
  LOCKED_CARD_ATTACK_SURFACE_REDUCTION,
  SWITCH_LABEL,
} from './attack_surface_reduction_card';
import { REGISTRY_CREDENTIAL_HARDENING_LICENSE_UPSELL } from '../shared_translations';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import userEvent from '@testing-library/user-event';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Attack Surface Reduction Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').attackSurface;

  let formProps: AttackSurfaceReductionCardProps;
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<AttackSurfaceReductionCard {...formProps} />));
  });

  it('should show card in edit mode', () => {
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch));
  });

  it('should show correct OS support', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValues)).toHaveTextContent('Windows');
  });

  it('should show option enabled', () => {
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('should show option disabled', () => {
    set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('should be able to toggle to disabled', async () => {
    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should should be able to toggle to enabled', async () => {
    set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);

    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.attack_surface_reduction.credential_hardening.enabled', true);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
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
        LOCKED_CARD_ATTACK_SURFACE_REDUCTION
      );
    });
  });

  describe('and displayed in View Mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render in view mode', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
    });

    it('should show correct value when checked', () => {
      render();

      expect(renderResult.getByTestId(testSubj.switchLabel)).toHaveTextContent(SWITCH_LABEL);
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
    });

    it('should show correct value when unchecked', () => {
      set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
      render();

      expect(renderResult.getByTestId(testSubj.switchLabel)).toHaveTextContent(SWITCH_LABEL);
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('false');
    });
  });

  it('should not render the registry credential hardening switch when the experimental flag is off', () => {
    render();

    expect(renderResult.queryByTestId(testSubj.registryCredentialHardeningSwitch)).toBeNull();
    expect(renderResult.queryByTestId(testSubj.registryCredentialHardeningSwitchLabel)).toBeNull();
  });

  describe('and the registry credential hardening experimental flag is on', () => {
    beforeEach(() => {
      mockedContext.setExperimentalFlag({ registryCredentialHardening: true });
    });

    it('should render the switch checked when the policy field is enabled', () => {
      set(
        formProps.policy,
        'windows.attack_surface_reduction.registry_credential_hardening.enabled',
        true
      );
      render();

      expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('should render the switch unchecked when the policy field is disabled', () => {
      set(
        formProps.policy,
        'windows.attack_surface_reduction.registry_credential_hardening.enabled',
        false
      );
      render();

      expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('should render the switch unchecked when the policy field is absent', () => {
      delete formProps.policy.windows.attack_surface_reduction.registry_credential_hardening;
      render();

      expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('should toggle only the registry credential hardening field, leaving credential hardening untouched', async () => {
      set(
        formProps.policy,
        'windows.attack_surface_reduction.registry_credential_hardening.enabled',
        false
      );
      const expectedUpdate = cloneDeep(formProps.policy);
      set(
        expectedUpdate,
        'windows.attack_surface_reduction.registry_credential_hardening.enabled',
        true
      );
      render();

      await userEvent.click(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch));

      expect(formProps.onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: expectedUpdate,
      });
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

      it('should render the switch disabled and show an Enterprise license hint', async () => {
        render();

        expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toBeDisabled();

        await userEvent.hover(
          renderResult.getByTestId(testSubj.registryCredentialHardeningTooltipIcon)
        );

        expect(
          await renderResult.findByText(REGISTRY_CREDENTIAL_HARDENING_LICENSE_UPSELL)
        ).toBeInTheDocument();
      });
    });

    describe('and a serverless PLI upsell message is present', () => {
      const pliUpsellMessage =
        'To enable registry credential hardening, you must add Endpoint Complete to your project.';

      beforeEach(() => {
        mockedContext.startServices.upselling.setMessages({
          endpoint_registry_credential_hardening: pliUpsellMessage,
        });
      });

      it('should render the switch disabled and show the PLI upsell message', async () => {
        render();

        expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toBeDisabled();

        await userEvent.hover(
          renderResult.getByTestId(testSubj.registryCredentialHardeningTooltipIcon)
        );

        expect(await renderResult.findByText(pliUpsellMessage)).toBeInTheDocument();
      });
    });

    describe('and displayed in View Mode', () => {
      beforeEach(() => {
        formProps.mode = 'view';
      });

      it('should render the switch disabled', () => {
        render();

        expect(renderResult.getByTestId(testSubj.registryCredentialHardeningSwitch)).toBeDisabled();
      });
    });
  });
});
