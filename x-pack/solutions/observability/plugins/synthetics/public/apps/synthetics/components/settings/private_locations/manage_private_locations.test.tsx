/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import * as permissionsHooks from '../../../hooks';
import * as locationHooks from './hooks/use_locations_api';
import * as settingsHooks from '../../../contexts/synthetics_settings_context';
import type { SyntheticsSettingsContextValues } from '../../../contexts';
import { ManagePrivateLocations } from './manage_private_locations';
import { fireEvent } from '@testing-library/react';

jest.mock('../../../hooks');
jest.mock('./hooks/use_locations_api');
jest.mock('../../../contexts/synthetics_settings_context');

describe('<ManagePrivateLocations />', () => {
  beforeEach(() => {
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(true);
    jest.spyOn(permissionsHooks, 'useFleetPermissions').mockReturnValue({
      canReadAgentPolicies: true,
      canSaveIntegrations: false,
      canCreateAgentPolicies: false,
    });
    jest.spyOn(locationHooks, 'usePrivateLocationsAPI').mockReturnValue({
      loading: false,
      onSubmit: jest.fn(),
      privateLocations: [],
      onDelete: jest.fn(),
      deleteLoading: false,
      createLoading: false,
    });
    jest.spyOn(permissionsHooks, 'useEnablement').mockReturnValue({
      isServiceAllowed: true,
      areApiKeysEnabled: true,
      canManageApiKeys: true,
      canEnable: true,
      isEnabled: true,
      invalidApiKeyError: false,
      loading: false,
      error: null,
    });
  });

  it.each([true, false])(
    'handles no agent found when the user does and does not have permissions',
    async (canSave) => {
      jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
        canSave,
      } as SyntheticsSettingsContextValues);
      const { getByText, getByRole, findByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: [],
            loading: false,
            error: null,
          },
          privateLocations: {
            isCreatePrivateLocationFlyoutVisible: false,
          },
        },
      });
      expect(getByText('No agent policies found')).toBeInTheDocument();

      if (canSave) {
        const button = getByRole('button', { name: 'Create agent policy' });
        expect(button).toBeDisabled();
      } else {
        const button = getByRole('button', { name: 'Create agent policy' });
        expect(button).toBeDisabled();
        // hover over the button to see the tooltip
        fireEvent.mouseOver(button);
        expect(
          await findByText(/You do not have sufficient permissions to perform this action./)
        ).toBeInTheDocument();
      }
    }
  );

  it.each([true, false])(
    'handles create first location when the user does and does not have permissions',
    async (canSave) => {
      jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
        canSave,
      } as SyntheticsSettingsContextValues);
      const { getByText, getByRole, findByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: [{}],
            loading: false,
            error: null,
          },
          privateLocations: {
            isCreatePrivateLocationFlyoutVisible: false,
          },
        },
      });
      expect(getByText('Create your first private location')).toBeInTheDocument();
      const button = getByRole('button', { name: 'Create location' });

      if (canSave) {
        expect(button).not.toBeDisabled();
      } else {
        expect(button).toBeDisabled();
        fireEvent.mouseOver(button);
        expect(
          await findByText(/You do not have sufficient permissions to perform this action./)
        ).toBeInTheDocument();
      }
    }
  );

  it.each([true, false])(
    'handles location table when the user does and does not have permissions',
    async (canSave) => {
      const privateLocationName = 'Test private location';
      jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
        canSave,
        canManagePrivateLocations: true,
      } as SyntheticsSettingsContextValues);

      jest.spyOn(locationHooks, 'usePrivateLocationsAPI').mockReturnValue({
        loading: false,
        onSubmit: jest.fn(),
        privateLocations: [
          {
            label: privateLocationName,
            id: 'lkjlere',
            agentPolicyId: 'lkjelrje',
            isServiceManaged: false,
          },
        ],
        onDelete: jest.fn(),
        deleteLoading: false,
        createLoading: false,
      });
      const { getByText, getByRole, findByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: [{}],
            loading: false,
            error: null,
          },
          privateLocations: {
            isCreatePrivateLocationFlyoutVisible: false,
          },
        },
      });
      expect(getByText(privateLocationName)).toBeInTheDocument();
      const button = getByRole('button', { name: 'Create location' });

      if (canSave) {
        expect(button).not.toBeDisabled();
      } else {
        expect(button).toBeDisabled();
        fireEvent.mouseOver(button);
        expect(
          await findByText('You do not have sufficient permissions to perform this action.')
        ).toBeInTheDocument();
      }
    }
  );
});
