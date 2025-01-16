/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { WrappedHelper } from '../../../../utils/testing';
import { getServiceLocations } from '../../../../state/service_locations';
import { setAddingNewPrivateLocation } from '../../../../state/private_locations';
import { usePrivateLocationsAPI } from './use_locations_api';
import * as locationAPI from '../../../../state/private_locations/api';
import * as reduxHooks from 'react-redux';

describe('usePrivateLocationsAPI', () => {
  const dispatch = jest.fn();
  const addAPI = jest.spyOn(locationAPI, 'addSyntheticsPrivateLocations').mockResolvedValue([]);
  const deletedAPI = jest
    .spyOn(locationAPI, 'deleteSyntheticsPrivateLocations')
    .mockResolvedValue([]);
  jest.spyOn(locationAPI, 'getSyntheticsPrivateLocations');
  jest.spyOn(reduxHooks, 'useDispatch').mockReturnValue(dispatch);

  it('returns expected results', () => {
    const { result } = renderHook(() => usePrivateLocationsAPI(), {
      wrapper: ({ children }) => createElement(WrappedHelper, null, children),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        loading: true,
        privateLocations: [],
      })
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  jest.spyOn(locationAPI, 'getSyntheticsPrivateLocations').mockResolvedValue([
    {
      id: 'Test',
      agentPolicyId: 'testPolicy',
    } as any,
  ]);
  it('returns expected results after data', async () => {
    const { result } = renderHook(() => usePrivateLocationsAPI(), {
      wrapper: ({ children }) => createElement(WrappedHelper, null, children),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        loading: true,
        privateLocations: [],
      })
    );

    await waitFor(() =>
      expect(result.current).toEqual(
        expect.objectContaining({
          loading: false,
          privateLocations: [],
        })
      )
    );
  });

  it('adds location on submit', async () => {
    const { result } = renderHook(() => usePrivateLocationsAPI(), {
      wrapper: ({ children }) => createElement(WrappedHelper, null, children),
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    act(() => {
      result.current.onSubmit({
        agentPolicyId: 'newPolicy',
        label: 'new',
        geo: {
          lat: 0,
          lon: 0,
        },
      });
    });

    await waitFor(() => {
      expect(addAPI).toHaveBeenCalledWith({
        geo: {
          lat: 0,
          lon: 0,
        },
        label: 'new',
        agentPolicyId: 'newPolicy',
      });
      expect(dispatch).toBeCalledWith(setAddingNewPrivateLocation(false));
      expect(dispatch).toBeCalledWith(getServiceLocations());
    });
  });

  it('deletes location on delete', async () => {
    const { result } = renderHook(() => usePrivateLocationsAPI(), {
      wrapper: ({ children }) => createElement(WrappedHelper, null, children),
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    act(() => {
      result.current.onDelete('Test');
    });

    await waitFor(() => {
      expect(deletedAPI).toHaveBeenLastCalledWith('Test');
      expect(dispatch).toBeCalledWith(setAddingNewPrivateLocation(false));
      expect(dispatch).toBeCalledWith(getServiceLocations());
    });
  });
});
