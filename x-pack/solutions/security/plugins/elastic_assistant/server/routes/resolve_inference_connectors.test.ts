/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import { ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID } from '../../common/constants';
import { resolveConnectorById } from './resolve_inference_connectors';
import { requestContextMock } from '../__mocks__/request_context';

const mockConnector: InferenceConnector = {
  connectorId: 'connector-1',
  name: 'Test Connector',
  type: '.gen-ai' as InferenceConnector['type'],
  config: {},
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
};

describe('resolveConnectorById', () => {
  const request = httpServerMock.createKibanaRequest();

  let assistantContext: ReturnType<
    typeof requestContextMock.createTools
  >['context']['elasticAssistant'];

  beforeEach(() => {
    const { context } = requestContextMock.createTools();
    assistantContext = context.elasticAssistant;
    jest.clearAllMocks();
  });

  describe('when Model Settings feature flag is disabled', () => {
    beforeEach(() => {
      (assistantContext.core.uiSettings.client.get as jest.Mock).mockResolvedValue(false);
    });

    it('falls back to inference.getConnectorById and returns the connector', async () => {
      (assistantContext.inference.getConnectorById as jest.Mock).mockResolvedValue(mockConnector);

      const result = await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(assistantContext.inference.getConnectorById).toHaveBeenCalledWith(
        'connector-1',
        request
      );
      expect(result).toEqual(mockConnector);
    });

    it('returns undefined when inference.getConnectorById rejects', async () => {
      (assistantContext.inference.getConnectorById as jest.Mock).mockRejectedValue(
        new Error('not found')
      );

      const result = await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('when Model Settings feature flag is enabled but searchInferenceEndpoints is absent', () => {
    beforeEach(() => {
      (assistantContext.core.uiSettings.client.get as jest.Mock).mockResolvedValue(true);
      // Remove optional plugin
      (assistantContext as Record<string, unknown>).searchInferenceEndpoints = undefined;
    });

    it('falls back to inference.getConnectorById', async () => {
      (assistantContext.inference.getConnectorById as jest.Mock).mockResolvedValue(mockConnector);

      const result = await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(assistantContext.inference.getConnectorById).toHaveBeenCalledWith(
        'connector-1',
        request
      );
      expect(result).toEqual(mockConnector);
    });
  });

  describe('when Model Settings feature flag is enabled and searchInferenceEndpoints is present', () => {
    const getForFeature = jest.fn();

    beforeEach(() => {
      (assistantContext.core.uiSettings.client.get as jest.Mock).mockResolvedValue(true);
      (assistantContext as Record<string, unknown>).searchInferenceEndpoints = {
        endpoints: { getForFeature },
      };
    });

    it('calls getForFeature with the correct feature id and request', async () => {
      getForFeature.mockResolvedValue({ endpoints: [mockConnector], warnings: [] });

      await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(getForFeature).toHaveBeenCalledWith(
        ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
        request
      );
    });

    it('returns the matching connector', async () => {
      const other: InferenceConnector = { ...mockConnector, connectorId: 'connector-2' };
      getForFeature.mockResolvedValue({ endpoints: [mockConnector, other], warnings: [] });

      const result = await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(result).toEqual(mockConnector);
    });

    it('logs warnings returned by getForFeature', async () => {
      getForFeature.mockResolvedValue({
        endpoints: [mockConnector],
        warnings: ['warning one', 'warning two'],
      });

      await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(assistantContext.logger.warn).toHaveBeenCalledWith('warning one');
      expect(assistantContext.logger.warn).toHaveBeenCalledWith('warning two');
    });

    it('throws 404 when the connectorId is not in the returned endpoints', async () => {
      getForFeature.mockResolvedValue({ endpoints: [mockConnector], warnings: [] });

      await expect(
        resolveConnectorById({
          assistantContext,
          request,
          connectorId: 'unknown-connector',
        })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 404 },
      });
    });

    it('throws 503 when getForFeature rejects', async () => {
      getForFeature.mockRejectedValue(new Error('SIEP unavailable'));

      await expect(
        resolveConnectorById({
          assistantContext,
          request,
          connectorId: 'connector-1',
        })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 503 },
      });
    });

    it('logs a warning when getForFeature rejects', async () => {
      getForFeature.mockRejectedValue(new Error('SIEP unavailable'));

      await expect(
        resolveConnectorById({ assistantContext, request, connectorId: 'connector-1' })
      ).rejects.toBeDefined();

      expect(assistantContext.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SIEP unavailable')
      );
    });
  });

  describe('uiSettings.client.get failure', () => {
    it('treats the flag as false and falls back to inference.getConnectorById', async () => {
      (assistantContext.core.uiSettings.client.get as jest.Mock).mockRejectedValue(
        new Error('settings unavailable')
      );
      (assistantContext.inference.getConnectorById as jest.Mock).mockResolvedValue(mockConnector);

      const result = await resolveConnectorById({
        assistantContext,
        request,
        connectorId: 'connector-1',
      });

      expect(result).toEqual(mockConnector);
    });
  });
});
