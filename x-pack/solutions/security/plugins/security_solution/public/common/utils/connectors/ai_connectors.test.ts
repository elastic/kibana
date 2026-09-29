/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { loadAiConnectors } from './ai_connectors';
import { loadAllActions } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';

vi.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => {
  const mocked = {
    loadAllActions: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/inference-endpoint-ui-common', () => {
  const mocked = {
    isInferenceEndpointExists: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockHttp = {} as HttpSetup;
const settings = {
  client: {
    get: vi.fn(),
  },
} as unknown as SettingsStart;
const mockLoadAllActions = loadAllActions as Mock;
const mockIsInferenceEndpointExists = isInferenceEndpointExists as Mock;

describe('loadAiConnectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only valid external AI connectors', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.gen-ai', isMissingSecrets: false } as ActionConnector,
      { id: '2', actionTypeId: '.gen-ai', isMissingSecrets: true } as ActionConnector,
      { id: '3', actionTypeId: '.webhook', isMissingSecrets: false } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors({ http: mockHttp, settings });

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

    const result = await loadAiConnectors({ http: mockHttp, settings });

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

    const result = await loadAiConnectors({ http: mockHttp, settings });

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

    const result = await loadAiConnectors({ http: mockHttp, settings });

    expect(result).toEqual([]);
  });

  it('should exclude connectors with missing secrets', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.bedrock', isMissingSecrets: true } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors({ http: mockHttp, settings });

    expect(result).toEqual([]);
  });

  it('should return an empty array if no connectors are valid', async () => {
    const mockConnectors: ActionConnector[] = [
      { id: '1', actionTypeId: '.webhook', isMissingSecrets: false } as ActionConnector,
    ];

    mockLoadAllActions.mockResolvedValue(mockConnectors);

    const result = await loadAiConnectors({ http: mockHttp, settings });

    expect(result).toEqual([]);
  });
});
