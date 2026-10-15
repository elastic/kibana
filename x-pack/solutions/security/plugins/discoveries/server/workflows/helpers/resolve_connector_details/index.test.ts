/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import { asNonEmpty } from '../../../lib/non_empty_string';
import { resolveConnectorDetails } from '.';

describe('resolveConnectorDetails', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockActionsClient = {
    get: jest.fn(),
  };

  const mockRequest = {} as KibanaRequest;

  const connectorId = 'connector-1';

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionsClient.get.mockResolvedValue({
      actionTypeId: '.gen-ai',
      id: connectorId,
      name: 'My OpenAI Connector',
    });
  });

  describe('when both actionTypeId and connectorName are provided', () => {
    it('returns the provided values without calling actionsClient.get', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty('.bedrock'),
        connectorId,
        connectorName: asNonEmpty('Existing Name'),
        logger: mockLogger,
      });

      expect(result).toEqual({
        actionTypeId: '.bedrock',
        connectorName: 'Existing Name',
      });
      expect(mockActionsClient.get).not.toHaveBeenCalled();
    });

    it('does not call inference.getConnectorById when both values are already provided', async () => {
      const mockGetConnectorById = jest.fn();
      const mockInference = {
        getConnectorById: mockGetConnectorById,
      } as unknown as InferenceServerStart;

      await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty('.bedrock'),
        connectorId,
        connectorName: asNonEmpty('Existing Name'),
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(mockGetConnectorById).not.toHaveBeenCalled();
    });

    it('triggers inference lookup when actionTypeId is asNonEmpty("") (i.e. undefined)', async () => {
      const mockGetConnectorById = jest.fn().mockResolvedValue({
        type: '.inference',
        name: 'EIS Connector',
      });
      const mockInference = {
        getConnectorById: mockGetConnectorById,
      } as unknown as InferenceServerStart;

      await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty(''),
        connectorId,
        connectorName: asNonEmpty('Existing Name'),
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(mockGetConnectorById).toHaveBeenCalled();
      expect(mockActionsClient.get).not.toHaveBeenCalled();
    });

    it('triggers inference lookup when connectorName is asNonEmpty("") (i.e. undefined)', async () => {
      const mockGetConnectorById = jest.fn().mockResolvedValue({
        type: '.inference',
        name: 'EIS Connector',
      });
      const mockInference = {
        getConnectorById: mockGetConnectorById,
      } as unknown as InferenceServerStart;

      await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty('.bedrock'),
        connectorId,
        connectorName: asNonEmpty(''),
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(mockGetConnectorById).toHaveBeenCalled();
      expect(mockActionsClient.get).not.toHaveBeenCalled();
    });
  });

  describe('when actionTypeId is missing', () => {
    it('resolves actionTypeId from actionsClient.get', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId,
        connectorName: asNonEmpty('Existing Name'),
        logger: mockLogger,
      });

      expect(result).toEqual({
        actionTypeId: '.gen-ai',
        connectorName: 'Existing Name',
      });
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: connectorId });
    });
  });

  describe('when connectorName is missing', () => {
    it('resolves connectorName from actionsClient.get', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty('.bedrock'),
        connectorId,
        logger: mockLogger,
      });

      expect(result).toEqual({
        actionTypeId: '.bedrock',
        connectorName: 'My OpenAI Connector',
      });
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: connectorId });
    });
  });

  describe('when both actionTypeId and connectorName are missing', () => {
    it('resolves both from actionsClient.get', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId,
        logger: mockLogger,
      });

      expect(result).toEqual({
        actionTypeId: '.gen-ai',
        connectorName: 'My OpenAI Connector',
      });
      expect(mockActionsClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('when actionsClient.get fails', () => {
    beforeEach(() => {
      mockActionsClient.get.mockRejectedValue(new Error('Connector not found'));
    });

    it('throws when actionTypeId is missing and lookup fails', async () => {
      await expect(
        resolveConnectorDetails({
          actionsClient: mockActionsClient,
          connectorId,
          logger: mockLogger,
        })
      ).rejects.toThrow(
        `Failed to resolve connector details for ${connectorId}: Connector not found`
      );
    });

    it('throws when connectorName is missing and lookup fails', async () => {
      await expect(
        resolveConnectorDetails({
          actionsClient: mockActionsClient,
          actionTypeId: asNonEmpty('.gen-ai'),
          connectorId,
          logger: mockLogger,
        })
      ).rejects.toThrow(
        `Failed to resolve connector details for ${connectorId}: Connector not found`
      );
    });
  });

  describe('when inference plugin is available', () => {
    const mockGetConnectorById = jest.fn();
    let mockInference: InferenceServerStart;

    beforeEach(() => {
      mockGetConnectorById.mockResolvedValue({
        type: '.inference',
        name: 'EIS Anthropic Claude',
      });
      mockInference = { getConnectorById: mockGetConnectorById } as unknown as InferenceServerStart;
    });

    it('uses inference.getConnectorById instead of actionsClient.get', async () => {
      await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId: '.anthropic-claude-4.6-opus-chat_completion',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(mockGetConnectorById).toHaveBeenCalledWith(
        '.anthropic-claude-4.6-opus-chat_completion',
        mockRequest
      );
      expect(mockActionsClient.get).not.toHaveBeenCalled();
    });

    it('resolves actionTypeId from inference connector type', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId: '.anthropic-claude-4.6-opus-chat_completion',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(result.actionTypeId).toBe('.inference');
    });

    it('resolves connectorName from inference connector name', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId: '.anthropic-claude-4.6-opus-chat_completion',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(result.connectorName).toBe('EIS Anthropic Claude');
    });

    it('preserves provided actionTypeId when resolving connectorName via inference', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        actionTypeId: asNonEmpty('.bedrock'),
        connectorId,
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(result.actionTypeId).toBe('.bedrock');
    });

    it('preserves provided connectorName when resolving actionTypeId via inference', async () => {
      const result = await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId,
        connectorName: asNonEmpty('My Custom Name'),
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(result.connectorName).toBe('My Custom Name');
    });

    it('throws when inference.getConnectorById fails', async () => {
      mockGetConnectorById.mockRejectedValue(new Error('EIS endpoint not found'));

      await expect(
        resolveConnectorDetails({
          actionsClient: mockActionsClient,
          connectorId: '.anthropic-claude-4.6-opus-chat_completion',
          inference: mockInference,
          logger: mockLogger,
          request: mockRequest,
        })
      ).rejects.toThrow(
        'Failed to resolve connector details for .anthropic-claude-4.6-opus-chat_completion: EIS endpoint not found'
      );
    });
  });

  describe('when inference plugin is available but request is missing', () => {
    it('falls back to actionsClient.get when request is not provided', async () => {
      const mockGetConnectorById = jest.fn();
      const mockInference = {
        getConnectorById: mockGetConnectorById,
      } as unknown as InferenceServerStart;

      await resolveConnectorDetails({
        actionsClient: mockActionsClient,
        connectorId,
        inference: mockInference,
        logger: mockLogger,
        // request intentionally omitted
      });

      expect(mockGetConnectorById).not.toHaveBeenCalled();
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: connectorId });
    });
  });
});
