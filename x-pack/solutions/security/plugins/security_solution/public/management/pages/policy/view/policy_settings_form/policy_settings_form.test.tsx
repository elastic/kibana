/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  expectIsViewOnly,
  getPolicySettingsFormTestSubjects,
  setAntivirusRegistration,
  setMalwareMode,
} from './mocks';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import type { PolicySettingsFormProps } from './policy_settings_form';
import { PolicySettingsForm } from './policy_settings_form';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { PolicyConfig } from '../../../../../../common/endpoint/types';
import {
  AntivirusRegistrationModes,
  ProtectionModes,
} from '../../../../../../common/endpoint/types';
import { updateAntivirusRegistrationEnabled } from '../../../../../../common/endpoint/utils/update_antivirus_registration_enabled';
import { set } from '@kbn/safer-lodash-set';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

jest.mock('../../../../../common/hooks/use_license');

describe('Endpoint Policy Settings Form', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test');

  let formProps: PolicySettingsFormProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let upsellingService: UpsellingService;
  let storageMock: IStorageWrapper;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    upsellingService = mockedContext.startServices.upselling;
    storageMock = mockedContext.startServices.storage;

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
    };

    storageMock.set('securitySolution.showEventMergingBanner', false);

    render = () => (renderResult = mockedContext.render(<PolicySettingsForm {...formProps} />));
  });

  describe('event merging banner', () => {
    beforeEach(() => {
      storageMock.set('securitySolution.showEventMergingBanner', true);
    });

    it('should show the event merging banner if it has never been dismissed', () => {
      render();

      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();
    });

    it('should show the event merging banner if `securitySolution.showEventMergingBanner` is `true`', () => {
      storageMock.set('securitySolution.showEventMergingBanner', true);
      render();

      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();
    });

    it('should hide the event merging banner when user dismisses it', async () => {
      render();
      expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();

      await userEvent.click(renderResult.getByTestId('euiDismissCalloutButton'));

      expect(renderResult.queryByTestId('eventMergingCallout')).not.toBeInTheDocument();
    });

    it('should persist that event merging banner have been dismissed', () => {
      render();

      renderResult.getByTestId('euiDismissCalloutButton').click();

      expect(storageMock.get('securitySolution.showEventMergingBanner')).toBe(false);
    });

    it('should not show the banner if it was dismissed before', () => {
      storageMock.set('securitySolution.showEventMergingBanner', false);
      render();

      expect(renderResult.queryByTestId('eventMergingCallout')).not.toBeInTheDocument();
    });
  });

  it.each([
    ['malware', testSubj.malware.card],
    ['ransomware', testSubj.ransomware.card],
    ['memory', testSubj.memory.card],
    ['behaviour', testSubj.behaviour.card],
    ['attack surface', testSubj.attackSurface.card],
    ['event collection', testSubj.eventCollection.card],
    ['antivirus registration', testSubj.antivirusRegistration.card],
    ['advanced settings', testSubj.advancedSection.container],
  ])('should include %s card', (_, testSubjSelector) => {
    render();

    expect(renderResult.getByTestId(testSubjSelector));
  });

  it('should render in View mode', () => {
    formProps.mode = 'view';
    render();

    expectIsViewOnly(renderResult.getByTestId('test'));
  });

  describe('and when policy protections are not available', () => {
    beforeEach(() => {
      upsellingService.setSections({
        endpointPolicyProtections: () => <div data-test-subj="paywall">{'pay up!'}</div>,
      });
    });

    it.each([
      ['malware', testSubj.malware.card],
      ['ransomware', testSubj.ransomware.card],
      ['memory', testSubj.memory.card],
      ['behaviour', testSubj.behaviour.card],
      ['attack surface', testSubj.attackSurface.card],
      ['antivirus registration', testSubj.antivirusRegistration.card],
    ])('should include %s card', (_, testSubjSelector) => {
      render();

      expect(renderResult.queryByTestId(testSubjSelector)).not.toBeInTheDocument();
    });

    it('should display upselling component', () => {
      render();
      expect(renderResult.getByTestId('paywall'));
    });
  });

  describe('when changing related settings', () => {
    let expectOnChangeToBeCalledWith: (updatedPolicy: PolicyConfig) => void;

    describe('related to antivirus registration', () => {
      beforeEach(() => {
        expectOnChangeToBeCalledWith = (updatedPolicy) =>
          expect(formProps.onChange).toBeCalledWith({
            isValid: true,
            updatedPolicy,
          });
      });

      describe('changing malware when antivirus registration is synced with malware', () => {
        it('should enable antivirus registration when malware is enabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, false);
          setMalwareMode({
            policy: formProps.policy,
            turnOff: true,
            includeSubfeatures: false,
          });
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.enableDisableSwitch));

          const expectedPolicy = cloneDeep(formProps.policy);
          updateAntivirusRegistrationEnabled(expectedPolicy);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should disable antivirus registration when malware is disabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, true);
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.enableDisableSwitch));

          const expectedPolicy = cloneDeep(formProps.policy);
          setMalwareMode({
            policy: expectedPolicy,
            turnOff: true,
            includeSubfeatures: false,
          });
          setAntivirusRegistration(expectedPolicy, AntivirusRegistrationModes.sync, false);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should disable antivirus registration when malware is set to detect only', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, true);
          setMalwareMode({ policy: formProps.policy });
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.windowsModeSelect));
          await waitForEuiPopoverOpen();
          await userEvent.click(screen.getByRole('option', { name: /^detect$/i }));

          const expectedPolicy = cloneDeep(formProps.policy);
          set(expectedPolicy, 'windows.malware.mode', ProtectionModes.detect);
          set(expectedPolicy, 'windows.popup.malware.enabled', false);
          updateAntivirusRegistrationEnabled(expectedPolicy);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });
      });

      describe('changing malware when antivirus registration is NOT synced with malware', () => {
        it('should not change antivirus registration when malware is enabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.disabled, false);
          setMalwareMode({
            policy: formProps.policy,
            turnOff: true,
            includeSubfeatures: false,
          });
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.enableDisableSwitch));

          const expectedPolicy = cloneDeep(formProps.policy);
          updateAntivirusRegistrationEnabled(expectedPolicy);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should not change antivirus registration when malware is disabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.enabled, true);
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.enableDisableSwitch));

          const expectedPolicy = cloneDeep(formProps.policy);
          setMalwareMode({
            policy: expectedPolicy,
            turnOff: true,
            includeSubfeatures: false,
          });
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should not change antivirus registration when malware is set to detect only', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.enabled, true);
          setMalwareMode({ policy: formProps.policy });
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.malware.windowsModeSelect));
          await waitForEuiPopoverOpen();
          await userEvent.click(screen.getByRole('option', { name: /^detect$/i }));

          const expectedPolicy = cloneDeep(formProps.policy);
          set(expectedPolicy, 'windows.malware.mode', ProtectionModes.detect);
          set(expectedPolicy, 'windows.popup.malware.enabled', false);
          updateAntivirusRegistrationEnabled(expectedPolicy);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });
      });

      describe('changing antivirus registration mode when malware is enabled', () => {
        it('should enable antivirus registration when set to sync', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.disabled, false);
          render();

          await userEvent.selectOptions(
            renderResult.getByTestId(testSubj.antivirusRegistration.modeSelect),
            AntivirusRegistrationModes.sync
          );

          const expectedPolicy = cloneDeep(formProps.policy);
          setAntivirusRegistration(expectedPolicy, AntivirusRegistrationModes.sync, true);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should disable antivirus registration when set to disabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, true);
          render();

          await userEvent.selectOptions(
            renderResult.getByTestId(testSubj.antivirusRegistration.modeSelect),
            AntivirusRegistrationModes.disabled
          );

          const expectedPolicy = cloneDeep(formProps.policy);
          setAntivirusRegistration(expectedPolicy, AntivirusRegistrationModes.disabled, false);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });
      });

      describe('changing antivirus registration mode when malware is disabled', () => {
        beforeEach(() => {
          setMalwareMode({
            policy: formProps.policy,
            turnOff: true,
            includeSubfeatures: false,
          });
        });

        it('should disable antivirus registration when set to sync', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.enabled, true);
          render();

          await userEvent.selectOptions(
            renderResult.getByTestId(testSubj.antivirusRegistration.modeSelect),
            AntivirusRegistrationModes.sync
          );

          const expectedPolicy = cloneDeep(formProps.policy);
          setAntivirusRegistration(expectedPolicy, AntivirusRegistrationModes.sync, false);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });

        it('should enable antivirus registration when set to enabled', async () => {
          setAntivirusRegistration(formProps.policy, AntivirusRegistrationModes.sync, false);
          render();

          await userEvent.selectOptions(
            renderResult.getByTestId(testSubj.antivirusRegistration.modeSelect),
            AntivirusRegistrationModes.enabled
          );

          const expectedPolicy = cloneDeep(formProps.policy);
          setAntivirusRegistration(expectedPolicy, AntivirusRegistrationModes.enabled, true);
          expectOnChangeToBeCalledWith(expectedPolicy);
        });
      });
    });
  });
});
