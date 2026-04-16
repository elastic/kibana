/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../common/mock/endpoint';
import { waitFor } from '@testing-library/dom';
import { useGetEndpointExceptionsPerPolicyOptIn } from './use_endpoint_per_policy_opt_in';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../../common/endpoint/constants';

describe('useGetEndpointExceptionsPerPolicyOptIn()', () => {
  let testContext: AppContextTestRender;

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    testContext.coreStart.http.get.mockResolvedValue({ isOptedIn: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when feature flag is disabled', () => {
    beforeEach(() => {
      testContext.setExperimentalFlag({ endpointExceptionsMovedUnderManagement: false });
    });

    it('should not call the API when no params are passed', () => {
      const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn());

      expect(result.current.data).toBeUndefined();
      expect(testContext.coreStart.http.get).not.toHaveBeenCalledWith(
        ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
        expect.anything()
      );
    });

    it('should not call the API even when enabled is true', () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: true })
      );

      expect(result.current.data).toBeUndefined();
      expect(testContext.coreStart.http.get).not.toHaveBeenCalledWith(
        ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
        expect.anything()
      );
    });
  });

  describe('when feature flag is enabled', () => {
    beforeEach(() => {
      testContext.setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });
    });

    it('should call the API when no params are passed', async () => {
      const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn());

      await waitFor(() => {
        expect(result.current.data).toEqual({ isOptedIn: false });
        expect(testContext.coreStart.http.get).toHaveBeenCalledWith(
          ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
          { version: '1' }
        );
      });
    });

    it('should call the API when empty object is passed', async () => {
      const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn({}));

      await waitFor(() => {
        expect(result.current.data).toEqual({ isOptedIn: false });
        expect(testContext.coreStart.http.get).toHaveBeenCalledWith(
          ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
          { version: '1' }
        );
      });
    });

    it('should call the API when enabled is true', async () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: true })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ isOptedIn: false });
        expect(testContext.coreStart.http.get).toHaveBeenCalledWith(
          ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
          { version: '1' }
        );
      });
    });

    it('should not call the API when enabled is false', async () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: false })
      );

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
        expect(testContext.coreStart.http.get).not.toHaveBeenCalledWith(
          ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
          expect.anything()
        );
      });
    });
  });
});
