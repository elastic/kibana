/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { PolicySettingsLayout } from './policy_settings_layout';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../common/components/user_privileges/__mocks__';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import { allFleetHttpMocks } from '../../../../mocks';
import userEvent from '@testing-library/user-event';
import {
  expectIsViewOnly,
  getPolicySettingsFormTestSubjects,
  setMalwareMode,
} from '../policy_settings_form/mocks';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { ProtectionModes } from '../../../../../../common/endpoint/types';
import { waitFor, cleanup } from '@testing-library/react';
import type { GetAgentStatusResponse } from '@kbn/fleet-plugin/common';
import { packagePolicyRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { getPolicyDataForUpdate } from '../../../../../../common/endpoint/service/policy';
import { getDeferred } from '../../../../mocks/utils';

jest.mock('../../../../../common/hooks/use_license');
jest.mock('../../../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('When rendering PolicySettingsLayout', () => {
  jest.setTimeout(15000);

  const testSubj = getPolicySettingsFormTestSubjects();

  let policyData: PolicyData;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let toasts: AppContextTestRender['coreStart']['notifications']['toasts'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    toasts = mockedContext.coreStart.notifications.toasts;
    apiMocks = allFleetHttpMocks(mockedContext.coreStart.http);
    policyData = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();
    render = () => {
      renderResult = mockedContext.render(
        <PolicySettingsLayout policy={policyData} setUnsavedChanges={jest.fn()} />
      );
      return renderResult;
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('and user has Edit permissions', () => {
    const clickSave = async (andConfirm: boolean = true, ensureApiIsCalled: boolean = true) => {
      const { getByTestId } = renderResult;

      await userEvent.click(getByTestId('policyDetailsSaveButton'));
      await waitFor(() => {
        expect(getByTestId('confirmModalConfirmButton'));
      });

      if (andConfirm) {
        await userEvent.click(getByTestId('confirmModalConfirmButton'));

        if (ensureApiIsCalled) {
          await waitFor(() => {
            expect(apiMocks.responseProvider.updateEndpointPolicy).toHaveBeenCalled();
          });
        }
      }
    };

    /**
     * Performs a minimal number of updates to make 'Save' button enabled.
     */
    const makeMinimalUpdates = async () => {
      const { getByTestId } = renderResult;
      await userEvent.click(getByTestId(testSubj.malware.enableDisableSwitch));
    };

    /**
     * Makes updates to the policy form on the UI and return back a new (cloned) `PolicyData`
     * with the updates reflected in it
     */
    const makeUpdates = async () => {
      const { getByTestId } = renderResult;
      const expectedUpdates = cloneDeep(policyData);
      const policySettings = expectedUpdates.inputs[0].config.policy.value;

      // Turn off malware
      await userEvent.click(getByTestId(testSubj.malware.enableDisableSwitch));
      setMalwareMode({
        policy: policySettings,
        turnOff: true,
        includeAntivirus: true,
      });

      // Turn off Behaviour Protection
      await userEvent.click(getByTestId(testSubj.behaviour.enableDisableSwitch));
      set(policySettings, 'windows.behavior_protection.mode', ProtectionModes.off);
      set(policySettings, 'mac.behavior_protection.mode', ProtectionModes.off);
      set(policySettings, 'linux.behavior_protection.mode', ProtectionModes.off);
      set(policySettings, 'windows.popup.behavior_protection.enabled', false);
      set(policySettings, 'mac.popup.behavior_protection.enabled', false);
      set(policySettings, 'linux.popup.behavior_protection.enabled', false);

      // Set Ransomware User Notification message
      await userEvent.type(getByTestId(testSubj.ransomware.notifyCustomMessage), 'foo message');
      set(policySettings, 'windows.popup.ransomware.message', 'foo message');

      // skipping Advanced Options as changing them takes too long.
      // todo: re-enable them with this issue: https://github.com/elastic/security-team/issues/11765
      // await userEvent.click(getByTestId(testSubj.advancedSection.showHideButton));
      // await userEvent.type(getByTestId('linux.advanced.agent.connection_delay'), '1000');
      // set(policySettings, 'linux.advanced.agent.connection_delay', '1000');

      return expectedUpdates;
    };

    it('should render layout with expected content when no changes have been made', () => {
      const { getByTestId } = render();

      expect(getByTestId('endpointPolicyForm'));
      expect(getByTestId('policyDetailsCancelButton')).not.toBeDisabled();
      expect(getByTestId('policyDetailsSaveButton')).toBeDisabled();
    });

    it('should render layout with expected content when changes have been made', async () => {
      const { getByTestId } = render();
      await makeMinimalUpdates();
      expect(getByTestId('endpointPolicyForm'));
      expect(getByTestId('policyDetailsCancelButton')).not.toBeDisabled();
      expect(getByTestId('policyDetailsSaveButton')).not.toBeDisabled();
    });

    it('should allow updates to be made', async () => {
      render();
      const expectedUpdatedPolicy = await makeUpdates();
      await clickSave();

      expect(apiMocks.responseProvider.updateEndpointPolicy).toHaveBeenCalledWith({
        path: packagePolicyRouteService.getUpdatePath(policyData.id),
        body: JSON.stringify(getPolicyDataForUpdate(expectedUpdatedPolicy)),
        version: API_VERSIONS.public.v1,
      });
    });

    it('should show buttons disabled while update is in flight', async () => {
      const deferred = getDeferred();
      apiMocks.responseProvider.updateEndpointPolicy.mockDelay.mockReturnValue(deferred.promise);
      const { getByTestId } = render();
      await makeMinimalUpdates();
      await clickSave(true, false);

      await waitFor(() => {
        expect(getByTestId('policyDetailsCancelButton')).toBeDisabled();
      });

      expect(getByTestId('policyDetailsSaveButton')).toBeDisabled();
      expect(
        getByTestId('policyDetailsSaveButton').querySelector('.euiLoadingSpinner')
      ).not.toBeNull();
    });

    it('should show success toast on update success', async () => {
      render();
      await makeMinimalUpdates();
      await clickSave();

      await waitFor(() => {
        expect(renderResult.getByTestId('policyDetailsSaveButton')).toBeDisabled();
      });

      expect(toasts.addSuccess).toHaveBeenCalledWith({
        'data-test-subj': 'policyDetailsSuccessMessage',
        text: 'Integration Endpoint Policy {ku5j) has been updated.',
        title: 'Success!',
      });
    });

    it('should show Danger toast on update failure', async () => {
      apiMocks.responseProvider.updateEndpointPolicy.mockImplementation(() => {
        throw new Error('oh oh!');
      });
      render();
      await makeMinimalUpdates();
      await clickSave();

      await waitFor(() => {
        expect(renderResult.getByTestId('policyDetailsSaveButton')).not.toBeDisabled();
      });

      expect(toasts.addDanger).toHaveBeenCalledWith({
        'data-test-subj': 'policyDetailsFailureMessage',
        text: 'oh oh!',
        title: 'Failed!',
      });
    });

    it('should not show warning about endpoints if there are no active endpoints', async () => {
      apiMocks.responseProvider.agentStatus.mockReturnValue({
        results: { active: 0 },
      } as GetAgentStatusResponse);

      const { getByTestId, queryByTestId } = render();
      await makeMinimalUpdates();

      await userEvent.click(getByTestId('policyDetailsSaveButton'));
      await waitFor(() => {
        expect(getByTestId('confirmModalConfirmButton')).toBeInTheDocument();
      });
      expect(queryByTestId('policyDetailsWarningCallout')).not.toBeInTheDocument();
    });

    it('should show warning about endpoints with the number of active endpoints', async () => {
      apiMocks.responseProvider.agentStatus.mockReturnValue({
        results: { active: 6 },
      } as GetAgentStatusResponse);

      const { getByTestId } = render();
      await makeMinimalUpdates();

      await userEvent.click(getByTestId('policyDetailsSaveButton'));
      await waitFor(() => {
        expect(getByTestId('confirmModalConfirmButton')).toBeInTheDocument();
      });

      const callout = getByTestId('policyDetailsWarningCallout');
      expect(callout).toBeInTheDocument();
      expect(callout.textContent).toContain('This action will update 6 endpoints');
    });
  });

  describe('and user has View Only permissions', () => {
    beforeEach(() => {
      const privileges = getUserPrivilegesMockDefaultValue();
      privileges.endpointPrivileges = getEndpointPrivilegesInitialStateMock({
        canWritePolicyManagement: false,
      });
      useUserPrivilegesMock.mockReturnValue(privileges);
    });

    afterEach(() => {
      useUserPrivilegesMock.mockReset();
      useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
    });

    it('should render form in view mode', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.form));
    });

    it('should not include the Save button', () => {
      render();

      expect(renderResult.queryByTestId('policyDetailsSaveButton')).toBeNull();
    });
  });
});
