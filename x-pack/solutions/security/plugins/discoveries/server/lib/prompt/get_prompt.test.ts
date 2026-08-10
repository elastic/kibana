/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrompt, getPromptsByGroupId } from './get_prompt';
import * as securityAiPromptsModule from '@kbn/security-ai-prompts';

jest.mock('@kbn/security-ai-prompts');

describe('get_prompt', () => {
  const mockGetPrompt = jest.fn();
  const mockGetPromptsByGroupId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (securityAiPromptsModule.getPrompt as jest.Mock) = mockGetPrompt;
    (securityAiPromptsModule.getPromptsByGroupId as jest.Mock) = mockGetPromptsByGroupId;
  });

  describe('getPromptsByGroupId', () => {
    it('calls the underlying function with local prompts injected', async () => {
      const mockArgs = {
        actionsClient: {} as any,
        connectorId: 'test-connector',
        promptGroupId: 'attackDiscovery',
        promptIds: ['default'],
        savedObjectsClient: {} as any,
      };

      const mockResult = [
        {
          prompt: 'test prompt',
          promptGroupId: 'attackDiscovery',
          promptId: 'default',
        },
      ];

      mockGetPromptsByGroupId.mockResolvedValue(mockResult);

      const result = await getPromptsByGroupId(mockArgs);

      expect(mockGetPromptsByGroupId).toHaveBeenCalledWith({
        ...mockArgs,
        localPrompts: expect.any(Array),
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPrompt', () => {
    it('calls the underlying function with local prompts injected', async () => {
      const mockArgs = {
        actionsClient: {} as any,
        connectorId: 'test-connector',
        promptGroupId: 'attackDiscovery',
        promptId: 'default',
        savedObjectsClient: {} as any,
      };

      const mockResult = 'test prompt string';

      mockGetPrompt.mockResolvedValue(mockResult);

      const result = await getPrompt(mockArgs);

      expect(mockGetPrompt).toHaveBeenCalledWith({
        ...mockArgs,
        localPrompts: expect.any(Array),
      });
      expect(result).toEqual(mockResult);
    });
  });
});
