/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryPrompts } from '.';
import * as promptModule from '../../prompt';

jest.mock('../../prompt');

describe('getAttackDiscoveryPrompts', () => {
  const mockGetPromptsByGroupId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (promptModule.getPromptsByGroupId as jest.Mock) = mockGetPromptsByGroupId;
  });

  it('returns combined prompts from saved objects', async () => {
    const mockPrompts = [
      { prompt: 'default prompt', promptId: 'default' },
      { prompt: 'refine prompt', promptId: 'refine' },
      { prompt: 'continue prompt', promptId: 'continue' },
      { prompt: 'details markdown prompt', promptId: 'detailsMarkdown' },
      { prompt: 'entity summary markdown prompt', promptId: 'entitySummaryMarkdown' },
      { prompt: 'mitre attack tactics prompt', promptId: 'mitreAttackTactics' },
      { prompt: 'summary markdown prompt', promptId: 'summaryMarkdown' },
      { prompt: 'title prompt', promptId: 'generationTitle' },
      { prompt: 'insights prompt', promptId: 'generationInsights' },
    ];

    mockGetPromptsByGroupId.mockResolvedValue(mockPrompts);

    const result = await getAttackDiscoveryPrompts({
      connectorId: 'test-connector',
      savedObjectsClient: {} as any,
    });

    expect(result).toEqual({
      continue: 'continue prompt',
      default: 'default prompt',
      detailsMarkdown: 'details markdown prompt',
      entitySummaryMarkdown: 'entity summary markdown prompt',
      insights: 'insights prompt',
      mitreAttackTactics: 'mitre attack tactics prompt',
      refine: 'refine prompt',
      summaryMarkdown: 'summary markdown prompt',
      title: 'title prompt',
    });
  });

  it('returns empty strings for missing prompts', async () => {
    mockGetPromptsByGroupId.mockResolvedValue([]);

    const result = await getAttackDiscoveryPrompts({
      connectorId: 'test-connector',
      savedObjectsClient: {} as any,
    });

    expect(result).toEqual({
      continue: '',
      default: '',
      detailsMarkdown: '',
      entitySummaryMarkdown: '',
      insights: '',
      mitreAttackTactics: '',
      refine: '',
      summaryMarkdown: '',
      title: '',
    });
  });

  it('passes all parameters to getPromptsByGroupId', async () => {
    mockGetPromptsByGroupId.mockResolvedValue([]);

    const mockGetInferenceConnectorById = jest.fn();

    await getAttackDiscoveryPrompts({
      connectorId: 'test-connector',
      getInferenceConnectorById: mockGetInferenceConnectorById,
      model: 'gpt-4',
      provider: 'openai',
      savedObjectsClient: {} as any,
    });

    expect(mockGetPromptsByGroupId).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      getInferenceConnectorById: mockGetInferenceConnectorById,
      model: 'gpt-4',
      promptGroupId: 'attackDiscovery',
      promptIds: [
        'default',
        'refine',
        'continue',
        'detailsMarkdown',
        'entitySummaryMarkdown',
        'mitreAttackTactics',
        'summaryMarkdown',
        'generationTitle',
        'generationInsights',
      ],
      provider: 'openai',
      savedObjectsClient: {},
    });
  });
});
