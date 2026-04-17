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

  it('should call the API when the experimental feature is enabled', async () => {
    testContext.setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });

    const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn());

    await waitFor(() => {
      expect(result.current.data).toEqual({ isOptedIn: false });
      expect(testContext.coreStart.http.get).toHaveBeenCalledWith(
        ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
        { version: '1' }
      );
    });
  });

  it('should not call the API when the experimental feature is disabled', () => {
    const { result } = testContext.renderHook(() => useGetEndpointExceptionsPerPolicyOptIn());

    expect(result.current.data).toBeUndefined();
    expect(testContext.coreStart.http.get).not.toHaveBeenCalledWith(
      ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
      expect.anything()
    );
  });
});
