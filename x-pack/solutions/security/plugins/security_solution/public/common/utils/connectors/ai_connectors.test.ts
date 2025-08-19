/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAiConnectors } from './ai_connectors';
import { loadAllActions } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  loadAllActions: jest.fn(),
}));

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  isInferenceEndpointExists: jest.fn(),
}));

const mockHttp = {} as HttpSetup;
const mockLoadAllActions = loadAllActions as jest.Mock;
const mockIsInferenceEndpointExists = isInferenceEndpointExists as jest.Mock;

describe('loadAiConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only valid external AI connectors', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.gen-ai', isMissingSecrets: false } as ActionConnector,
      { id: '2', actionTypeId: '.gen-ai', isMissingSecrets: true } as ActionConnector,
      { id: '3', actionTypeId: '.webhook', isMissingSecrets: false } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors(mockHttp);

    expect(result).toEqual([{ id: '1', actionTypeId: '.gen-ai', isMissingSecrets: false }]);
  });

  it('should include valid preconfigured inference connectors with existing endpoint', async () => {
    const mockConnectors: ActionConnector[] = [
      {
        id: '1',
        actionTypeId: '.inference',
        isMissingSecrets: false,
        isPreconfigured: true,
        config: { inferenceId: 'my-inference' },
      } as unknown as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);
    mockIsInferenceEndpointExists.mockResolvedValue(true);

    const result = await loadAiConnectors(mockHttp);

    expect(mockIsInferenceEndpointExists).toHaveBeenCalledWith(mockHttp, 'my-inference');
    expect(result).toEqual(mockConnectors);
  });

  it('should exclude inference connectors if endpoint does not exist', async () => {
    const mockConnectors: ActionConnector[] = [
      {
        id: '1',
        actionTypeId: '.inference',
        isMissingSecrets: false,
        isPreconfigured: true,
        config: { inferenceId: 'missing' },
      } as unknown as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);
    mockIsInferenceEndpointExists.mockResolvedValue(false);

    const result = await loadAiConnectors(mockHttp);

    expect(result).toEqual([]);
  });

  it('should exclude inference connectors if it is not configured correctly', async () => {
    const mockConnectors: ActionConnector[] = [
      {
        id: '1',
        actionTypeId: '.inference',
        isMissingSecrets: false,
        isPreconfigured: true,
        config: { inferenceId: undefined },
      } as unknown as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);
    mockIsInferenceEndpointExists.mockResolvedValue(true);

    const result = await loadAiConnectors(mockHttp);

    expect(result).toEqual([]);
  });

  it('should exclude connectors with missing secrets', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.bedrock', isMissingSecrets: true } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors(mockHttp);

    expect(result).toEqual([]);
  });

  it('should return an empty array if no connectors are valid', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.webhook', isMissingSecrets: false } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors(mockHttp);

    expect(result).toEqual([]);
  });
});
