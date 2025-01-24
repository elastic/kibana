/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { mockProviders } from '../../public/utils/test_utils/test_utils';

import { fetchInferenceServices } from './fetch_inference_services';

describe('fetch inference services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClient = {
    asCurrentUser: {
      transport: {
        request: jest.fn(),
      },
    },
  };
  it('returns all inference services', async () => {
    mockClient.asCurrentUser.transport.request.mockImplementationOnce(() => {
      return Promise.resolve({ services: mockProviders });
    });

    const services = await fetchInferenceServices(
      mockClient.asCurrentUser as unknown as ElasticsearchClient
    );

    expect(services).toEqual({
      services: mockProviders,
    });
  });
});
