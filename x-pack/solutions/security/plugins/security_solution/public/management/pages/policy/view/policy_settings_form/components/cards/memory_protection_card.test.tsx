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
import type { MemoryProtectionCardProps } from './memory_protection_card';
import { LOCKED_CARD_MEMORY_TITLE, MemoryProtectionCard } from './memory_protection_card';
import { MEMORY_THREAT_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Memory Protections Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').memory;

  let formProps: MemoryProtectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

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
    expect(getByTestId(testSubj.windowsModeSelect));
    expect(getByTestId(testSubj.windowsNotifyUserCheckbox));
  });

  it('should show supported OS values', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValuesContainer)).toHaveTextContent(
      MEMORY_THREAT_POLICY_SECTION_DESCRIPTION
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

      const card = getByTestId(testSubj.card);
      expect(getByTestId(`${testSubj.card}-type`)).toHaveTextContent(
        exactMatchText('Memory threat')
      );
      expect(getByTestId(`${testSubj.card}-osValues`)).toHaveTextContent(
        exactMatchText(MEMORY_THREAT_POLICY_SECTION_DESCRIPTION)
      );
      expect(getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
        'aria-label',
        'Memory threat protections'
      );
      expect(card.textContent).not.toContain('TypeMemory threat');
      expect(card.textContent).not.toContain('Operating system');
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId('test-memory-windowsNotifyUser-checkbox')).toBeChecked();
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.memory_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'mac.memory_protection.mode', ProtectionModes.off);
      set(formProps.policy, 'linux.memory_protection.mode', ProtectionModes.off);
      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      const card = getByTestId(testSubj.card);
      expect(getByTestId(`${testSubj.card}-type`)).toHaveTextContent(
        exactMatchText('Memory threat')
      );
      expect(getByTestId(`${testSubj.card}-osValues`)).toHaveTextContent(
        exactMatchText(MEMORY_THREAT_POLICY_SECTION_DESCRIPTION)
      );
      expect(getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
        'aria-label',
        'Memory threat protections'
      );
      expect(card.textContent).not.toContain('TypeMemory threat');
      expect(card.textContent).not.toContain('Operating system');
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('false');
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.memory_protection.enabled', false);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      const card = getByTestId(testSubj.card);
      expect(getByTestId(`${testSubj.card}-type`)).toHaveTextContent(
        exactMatchText('Memory threat')
      );
      expect(getByTestId(`${testSubj.card}-osValues`)).toHaveTextContent(
        exactMatchText(MEMORY_THREAT_POLICY_SECTION_DESCRIPTION)
      );
      expect(getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
        'aria-label',
        'Memory threat protections'
      );
      expect(card.textContent).not.toContain('TypeMemory threat');
      expect(card.textContent).not.toContain('Operating system');
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId('test-memory-windowsNotifyUser-checkbox')).not.toBeChecked();
    });
  });
});
