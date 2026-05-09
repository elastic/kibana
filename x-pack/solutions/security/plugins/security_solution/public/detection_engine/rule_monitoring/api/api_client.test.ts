/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';

import { api } from './api_client';

jest.mock('../../../common/lib/kibana');

describe('Rule Monitoring API Client', () => {
  const fetchMock = jest.fn();
  const mockKibanaServices = KibanaServices.get as jest.Mock;
  mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

  describe('setupDetectionEngineHealthApi', () => {
    const responseMock = {};

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(responseMock);
    });

    it('calls API with correct parameters', async () => {
      await api.setupDetectionEngineHealthApi();

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/health/_setup',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
