/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivateLocation } from '../../../../../common/runtime_types';
import { privateLocationsStateReducer } from '.';
import { editPrivateLocationAction, setPrivateLocationToEdit } from './actions';

const location: PrivateLocation = {
  id: 'loc-1',
  label: 'Local',
  agentPolicyId: 'policy-1',
  isServiceManaged: false,
  isInvalid: false,
};

const fetchError = {
  name: 'Error',
  body: { message: 'Unable to rewrite monitors' },
  requestUrl: '/internal/synthetics/service/private_locations/loc-1',
};

describe('privateLocationsStateReducer', () => {
  it('keeps privateLocationToEdit and the flyout open when edit fails', () => {
    const editing = privateLocationsStateReducer(undefined, setPrivateLocationToEdit(location));
    const withFlyout = {
      ...editing,
      isPrivateLocationFlyoutVisible: true,
      editLoading: true,
    };

    const failed = privateLocationsStateReducer(
      withFlyout,
      editPrivateLocationAction.fail(fetchError)
    );

    expect(failed).toEqual(
      expect.objectContaining({
        privateLocationToEdit: location,
        isPrivateLocationFlyoutVisible: true,
        editLoading: false,
        error: fetchError,
      })
    );
  });

  it('clears privateLocationToEdit and closes the flyout when edit succeeds', () => {
    const editing = privateLocationsStateReducer(undefined, setPrivateLocationToEdit(location));

    const succeeded = privateLocationsStateReducer(
      { ...editing, isPrivateLocationFlyoutVisible: true, editLoading: true },
      editPrivateLocationAction.success(location)
    );

    expect(succeeded).toEqual(
      expect.objectContaining({
        privateLocationToEdit: undefined,
        isPrivateLocationFlyoutVisible: false,
        editLoading: false,
      })
    );
  });
});
