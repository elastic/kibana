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
import { endpointExceptionsPerPolicyOptInAllHttpMocks } from '../../mocks/endpoint_per_policy_opt_in_http_mocks';

describe('useGetEndpointExceptionsPerPolicyOptIn()', () => {
  let testContext: AppContextTestRender;
  let getOptInHttpMock: ReturnType<
    typeof endpointExceptionsPerPolicyOptInAllHttpMocks
  >['responseProvider']['optInGet'];

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    getOptInHttpMock = endpointExceptionsPerPolicyOptInAllHttpMocks(testContext.coreStart.http)
      .responseProvider.optInGet;
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
      expect(getOptInHttpMock).not.toHaveBeenCalled();
    });

    it('should not call the API even when enabled is true', () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: true })
      );

      expect(result.current.data).toBeUndefined();
      expect(getOptInHttpMock).not.toHaveBeenCalled();
    });
  });

  describe('when feature flag is enabled', () => {
    beforeEach(() => {
      testContext.setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });
    });

    it('should call the API when no params are passed', async () => {
      const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn());

      await waitFor(() => {
        expect(result.current.data).toEqual({ status: false });
        expect(getOptInHttpMock).toHaveBeenCalled();
      });
    });

    it('should call the API when empty object is passed', async () => {
      const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn({}));

      await waitFor(() => {
        expect(result.current.data).toEqual({ status: false });
        expect(getOptInHttpMock).toHaveBeenCalled();
      });
    });

    it('should call the API when enabled is true', async () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: true })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ status: false });
        expect(getOptInHttpMock).toHaveBeenCalled();
      });
    });

    it('should not call the API when enabled is false', async () => {
      const { result } = testContext.renderHook(() =>
        useGetEndpointExceptionsPerPolicyOptIn({ enabled: false })
      );

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
        expect(getOptInHttpMock).not.toHaveBeenCalled();
      });
    });
  });
});
