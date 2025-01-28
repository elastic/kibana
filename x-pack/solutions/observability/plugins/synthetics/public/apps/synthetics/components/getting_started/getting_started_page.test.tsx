/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as permissionsHooks from '../../hooks/use_fleet_permissions';
import { render } from '../../utils/testing/rtl_helpers';
import { GettingStartedPage } from './getting_started_page';
import * as privateLocationsHooks from '../settings/private_locations/hooks/use_locations_api';
import * as settingsHooks from '../../contexts/synthetics_settings_context';
import { SyntheticsSettingsContextValues } from '../../contexts/synthetics_settings_context';
import { fireEvent } from '@testing-library/react';
import { kibanaService } from '../../../../utils/kibana_service';

describe('GettingStartedPage', () => {
  beforeEach(() => {
    jest.spyOn(privateLocationsHooks, 'usePrivateLocationsAPI').mockReturnValue({
      loading: false,
      privateLocations: [],
      deleteLoading: false,
      onSubmit: jest.fn(),
      onDelete: jest.fn(),
      createLoading: false,
    });
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(true);
  });
  it('works with cloud locations', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Create a single page browser monitor')).toBeInTheDocument();
  });

  it('serves on prem getting started experience when locations are not available', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();
  });

  it('shows need agent flyout when isAddingNewPrivateLocation is true and agentPolicies.length === 0', async () => {
    jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
      canSave: true,
    } as SyntheticsSettingsContextValues);

    const { getByText, getByRole, queryByLabelText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        privateLocations: {
          isCreatePrivateLocationFlyoutVisible: true,
        },
        agentPolicies: {
          data: [],
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(getByText('No agent policies found')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Create agent policy' })).not.toBeEnabled();
    expect(queryByLabelText('Location name')).not.toBeInTheDocument();
    expect(queryByLabelText('Agent policy')).not.toBeInTheDocument();
  });

  it('shows add location flyout when isAddingNewPrivateLocation is true and agentPolicies.length > 0', async () => {
    const { getByText, getByRole, getByLabelText, queryByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          data: [{}],
        },
        privateLocations: {
          isCreatePrivateLocationFlyoutVisible: true,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(queryByText('No agent policies found')).not.toBeInTheDocument();
    expect(getByLabelText('Location name')).toBeInTheDocument();
    expect(getByLabelText('Agent policy')).toBeInTheDocument();
  });

  it('shows permissions tooltip when the user does not have permissions', async () => {
    jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
      canSave: false,
    } as SyntheticsSettingsContextValues);
    const { getByText, getByRole, queryByLabelText, queryByRole, findByText } = render(
      <GettingStartedPage />,
      {
        state: {
          syntheticsEnablement: {
            loading: false,
            enablement: {
              canEnable: true,
              isEnabled: true,
              isServiceAllowed: true,
            },
          },
          serviceLocations: {
            locations: [],
            locationsLoaded: true,
            loading: false,
          },
          agentPolicies: {
            data: [{}],
          },
          privateLocations: {
            isCreatePrivateLocationFlyoutVisible: true,
          },
        },
      }
    );

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(queryByLabelText('Location name')).toBeInTheDocument();
    expect(queryByLabelText('Agent policy')).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.mouseOver(getByRole('button', { name: 'Save' }));
    expect(
      await findByText(/You do not have sufficient permissions to perform this action./)
    ).toBeInTheDocument();
  });

  it('should call enablement API and redirect to monitors', function () {
    render(<GettingStartedPage />, {
      state: {
        syntheticsEnablement: {
          loading: false,
          enablement: {
            canEnable: false,
            isEnabled: false,
          },
        },
      },
    });

    // page is loaded
    expect(kibanaService.coreStart.application.navigateToApp).toHaveBeenCalledWith('synthetics', {
      path: '/monitors',
    });
  });
});
