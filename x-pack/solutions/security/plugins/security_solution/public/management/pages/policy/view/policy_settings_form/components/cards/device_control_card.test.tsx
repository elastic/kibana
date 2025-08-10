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
import { DeviceControlAccessLevel } from '../../../../../../../../common/endpoint/types';
import { set } from '@kbn/safer-lodash-set';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import type { DeviceControlProps } from './device_control_card';
import { DEVICE_CONTROL_CARD_TITLE, DeviceControlCard } from './device_control_card';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Device Control Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').deviceControl;

  let formProps: DeviceControlProps;
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

    render = () => (renderResult = mockedContext.render(<DeviceControlCard {...formProps} />));
  });

  it('should render the card with expected components', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.enableDisableSwitch));
    expect(getByTestId(testSubj.protectionAuditRadio));
    expect(getByTestId(testSubj.notifyUserCheckbox));
  });

  it('should show supported OS values', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValuesContainer)).toHaveTextContent(
      exactMatchText('Windows, Mac')
    );
  });

  describe('and license is lower than Enterprise', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isEnterprise.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not enterprise+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        exactMatchText(DEVICE_CONTROL_CARD_TITLE)
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
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user' +
            'Notification message' +
            '—'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).toHaveAttribute('checked');
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.device_control.enabled', false);
      set(formProps.policy, 'mac.device_control.enabled', false);
      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          ['Type', 'Device Control', 'Operating system', 'Windows, Mac ', 'Device Control'].join('')
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('false');
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.device_control.enabled', false);
      set(formProps.policy, 'mac.popup.device_control.enabled', false);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user'
        )
      );
      expect(getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')).toBe('true');
      expect(getByTestId(testSubj.notifyUserCheckbox)).not.toHaveAttribute('checked');
    });

    it('should display correctly with block protection level', () => {
      set(
        formProps.policy,
        'windows.device_control.access_level',
        DeviceControlAccessLevel.deny_all
      );
      set(formProps.policy, 'mac.device_control.access_level', DeviceControlAccessLevel.deny_all);

      const { getByTestId } = render();

      expectIsViewOnly(getByTestId(testSubj.card));

      expect(getByTestId(testSubj.card)).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Device Control' +
            'Operating system' +
            'Windows, Mac ' +
            'Device Control' +
            'USB storage access level' +
            'Block all' +
            'User notification' +
            'Notify user' +
            'Notification message' +
            '—'
        )
      );
    });
  });
});
