/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux-v7';
import { HookWrapper, getHistoryFromUrl, mergeTestState } from './hook_helpers';
import type { HookWrapperProps } from './hook_helpers';
import { mockState } from './__mocks__/synthetics_store.mock';

describe('hook_helpers', () => {
  describe('getHistoryFromUrl', () => {
    it('builds history from a string url', () => {
      expect(getHistoryFromUrl('/monitors?a=1').location).toMatchObject({
        pathname: '/monitors',
        search: '?a=1',
      });
    });

    it('builds history from a path and query params', () => {
      expect(
        getHistoryFromUrl({ path: '/monitors', queryParams: { page: 2 } }).location
      ).toMatchObject({ pathname: '/monitors', search: '?page=2' });
    });
  });

  describe('mergeTestState', () => {
    it('returns the default mock state when no state is given', () => {
      expect(mergeTestState()).toBe(mockState);
    });

    it('replaces arrays instead of merging them', () => {
      const state = mergeTestState({
        serviceLocations: {
          locations: [{ id: 'a', label: 'A', url: 'u', isServiceManaged: true }],
        },
      });

      expect(state.serviceLocations.locations).toHaveLength(1);
    });
  });

  describe('HookWrapper', () => {
    const renderWithWrapper = (props: HookWrapperProps) =>
      renderHook(
        () => ({
          location: useLocation(),
          locations: useSelector((state: typeof mockState) => state.serviceLocations.locations),
        }),
        { wrapper: ({ children }) => <HookWrapper {...props}>{children}</HookWrapper> }
      );

    it('provides the router and the mock store', () => {
      const { result } = renderWithWrapper({
        url: '/monitors?a=1',
        state: {
          serviceLocations: {
            locations: [{ id: 'a', label: 'A', url: 'u', isServiceManaged: true }],
          },
        },
      });

      expect(result.current.location).toMatchObject({ pathname: '/monitors', search: '?a=1' });
      expect(result.current.locations).toHaveLength(1);
    });

    it('uses the given history', () => {
      const history = getHistoryFromUrl('/given');

      const { result } = renderWithWrapper({ history });

      expect(result.current.location.pathname).toBe('/given');
    });
  });
});
