/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { KibanaRequest } from '@kbn/core/server';

import { buildResolveConnector } from '.';

const mockRequest = {} as KibanaRequest;

describe('buildResolveConnector', () => {
  describe('when inference plugin is available', () => {
    it('uses inference.getConnectorById for EIS endpoint connectors (ids starting with .)', async () => {
      const mockGetConnectorById = vi
        .fn()
        .mockResolvedValue({ name: 'EIS Connector', type: '.openai' });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: vi
              .fn()
              .mockRejectedValue(new Error('should not be called')),
          },
          inference: { getConnectorById: mockGetConnectorById },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: '.openai-gpt-5.2-chat_completion',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      await resolveConnector();

      expect(mockGetConnectorById).toHaveBeenCalledWith(
        '.openai-gpt-5.2-chat_completion',
        mockRequest
      );
    });

    it('uses inference.getConnectorById for regular stack connectors too', async () => {
      const mockGetConnectorById = vi
        .fn()
        .mockResolvedValue({ name: 'Stack Connector', type: '.gen-ai' });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: vi
              .fn()
              .mockRejectedValue(new Error('should not be called')),
          },
          inference: { getConnectorById: mockGetConnectorById },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: 'my-openai-connector-id',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      await resolveConnector();

      expect(mockGetConnectorById).toHaveBeenCalledWith('my-openai-connector-id', mockRequest);
    });

    it('does not call actionsClient.get when inference is available', async () => {
      const mockActionsClientGet = vi.fn().mockResolvedValue({ id: 'conn-1' });
      const mockGetActionsClientWithRequest = vi
        .fn()
        .mockResolvedValue({ get: mockActionsClientGet });
      const mockGetConnectorById = vi
        .fn()
        .mockResolvedValue({ name: 'EIS Connector', type: '.openai' });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
          inference: { getConnectorById: mockGetConnectorById },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: '.openai-gpt-5.2-chat_completion',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      await resolveConnector();

      expect(mockActionsClientGet).not.toHaveBeenCalled();
    });
  });

  describe('when inference plugin is not available', () => {
    it('falls back to actionsClient.get', async () => {
      const mockActionsClientGet = vi
        .fn()
        .mockResolvedValue({ id: 'conn-1', name: 'Connector 1' });
      const mockGetActionsClientWithRequest = vi
        .fn()
        .mockResolvedValue({ get: mockActionsClientGet });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: 'conn-1',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      await resolveConnector();

      expect(mockActionsClientGet).toHaveBeenCalledWith({ id: 'conn-1' });
    });

    it('calls getActionsClientWithRequest with request', async () => {
      const mockActionsClientGet = vi
        .fn()
        .mockResolvedValue({ id: 'conn-1', name: 'Connector 1' });
      const mockGetActionsClientWithRequest = vi
        .fn()
        .mockResolvedValue({ get: mockActionsClientGet });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: 'conn-1',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      await resolveConnector();

      expect(mockGetActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('returns the connector from actionsClient.get', async () => {
      const expectedConnector = { id: 'conn-1', name: 'My Connector', actionTypeId: '.gen-ai' };
      const mockActionsClientGet = vi.fn().mockResolvedValue(expectedConnector);
      const mockGetActionsClientWithRequest = vi
        .fn()
        .mockResolvedValue({ get: mockActionsClientGet });
      const mockGetStartServices = vi.fn().mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
        },
      });

      const resolveConnector = buildResolveConnector({
        connectorId: 'conn-1',
        getStartServices: mockGetStartServices,
        request: mockRequest,
      });

      const result = await resolveConnector();

      expect(result).toEqual(expectedConnector);
    });
  });
});
