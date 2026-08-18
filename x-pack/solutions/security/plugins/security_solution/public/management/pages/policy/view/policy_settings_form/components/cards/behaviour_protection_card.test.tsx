/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, exactMatchText, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { set } from '@kbn/safer-lodash-set';
import { ProtectionModes } from '../../../../../../../../common/endpoint/types';
import type { BehaviourProtectionCardProps } from './protection_settings_card/behaviour_protection_card';
import {
  BehaviourProtectionCard,
  LOCKED_CARD_BEHAVIOR_TITLE,
} from './protection_settings_card/behaviour_protection_card';
import { BEHAVIOR_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Behaviour Protection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').behaviour;

  let formProps: BehaviourProtectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let startServices: AppContextTestRender['startServices'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    startServices = mockedContext.startServices;

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<BehaviourProtectionCard {...formProps} />));
  });

  it('should render the card with expected components', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.enableDisableSwitch));
    expect(getByTestId(testSubj.windowsModeSelect));
    expect(getByTestId(testSubj.windowsNotifyUserCheckbox));
    expect(getByTestId(testSubj.reputationServiceCheckbox)).toBeInTheDocument();
  });

  it('should show supported OS values', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.osValuesContainer)).toHaveTextContent(
      BEHAVIOR_POLICY_SECTION_DESCRIPTION
    );
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
        LOCKED_CARD_BEHAVIOR_TITLE
      );
    });
  });

  describe('and displayed in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    const assertSettingCardHeader = () => {
      const { getByTestId } = renderResult;
      const card = getByTestId(testSubj.card);
      expect(getByTestId(`${testSubj.card}-type`)).toHaveTextContent(
        exactMatchText('Malicious behavior')
      );
      expect(getByTestId(`${testSubj.card}-osValues`)).toHaveTextContent(
        exactMatchText(BEHAVIOR_POLICY_SECTION_DESCRIPTION)
      );
      expect(getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
        'aria-label',
        'Malicious behavior protections'
      );
      expect(card.textContent).not.toContain('TypeMalicious behavior');
      expect(card.textContent).not.toContain('Operating system');
    };

    it('should display correctly when overall card is enabled', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
      assertSettingCardHeader();
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
      expect(renderResult.getByTestId('test-behaviour-windowsNotifyUser-checkbox')).toBeChecked();
    });

    it('should display correctly when overall card is enabled for cloud user', () => {
      startServices.cloud!.isCloudEnabled = true;

      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
      assertSettingCardHeader();
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
      expect(renderResult.getByTestId('test-behaviour-windowsNotifyUser-checkbox')).toBeChecked();
      expect(
        renderResult.getByTestId('test-behaviour-windowsReputationService-switch')
      ).not.toBeChecked();
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.behavior_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'mac.behavior_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'linux.behavior_protection.mode', ProtectionModes.off);

      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
      assertSettingCardHeader();
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('false');
    });

    it('should display correctly when overall card is disabled for cloud user', () => {
      startServices.cloud!.isCloudEnabled = true;
      set(formProps.policy, 'windows.behavior_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'mac.behavior_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'linux.behavior_protection.mode', ProtectionModes.off);

      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
      assertSettingCardHeader();
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('false');
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.behavior_protection.enabled', false);

      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
      assertSettingCardHeader();
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
      expect(
        renderResult.getByTestId('test-behaviour-windowsNotifyUser-checkbox')
      ).not.toBeChecked();
    });
  });
});
