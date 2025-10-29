/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import { useGetEndpointSecurityPackage } from './hooks';
import { getFakeHttpService, renderQuery } from '../../hooks/test_utils';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { useHttp } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

describe('useGetEndpointSecurityPackage hook', () => {
  let result: ReturnType<typeof useGetEndpointSecurityPackage>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let generator: EndpointDocGenerator;
  let options: UseQueryOptions<GetInfoResponse['item'], IHttpFetchError> | undefined;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
    (useHttp as jest.Mock).mockReturnValue(fakeHttpServices);
    generator = new EndpointDocGenerator('endpoint-package');
  });

  afterEach(() => {
    options = undefined;
  });

  it('retrieves the endpoint package', async () => {
    const apiResponse = {
      item: [generator.generateEpmPackageInfo()],
    };
    fakeHttpServices.get.mockResolvedValue(apiResponse);
    const onSuccessMock: jest.Mock = jest.fn();
    options = {
      enabled: true,
      onSuccess: onSuccessMock,
      retry: false,
    };

    result = await renderQuery(
      () => useGetEndpointSecurityPackage({ customQueryOptions: options }),
      'isSuccess'
    );
    expect(result.data).toBe(apiResponse.item);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the service fails to retrieve the endpoint package', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.get.mockRejectedValue(error);
    const onErrorMock: jest.Mock = jest.fn();
    options = {
      enabled: true,
      onError: onErrorMock,
      retry: false,
    };

    result = await renderQuery(
      () => useGetEndpointSecurityPackage({ customQueryOptions: options }),
      'isError'
    );

    expect(result.error).toBe(error);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
  });
});
