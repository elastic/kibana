/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { getAttackDiscoveryPrompts } from '.';
import { getPromptsByGroupId, promptDictionary } from '../../../../../../prompt';
import { promptGroupId } from '../../../../../../prompt/local_prompt_object';

jest.mock('../../../../../../prompt', () => {
  const original = jest.requireActual('../../../../../../prompt');
  return {
    ...original,
    getPromptsByGroupId: jest.fn(),
  };
});
const mockGetPromptsByGroupId = getPromptsByGroupId as jest.Mock;

describe('getAttackDiscoveryPrompts', () => {
  const actionsClient = {} as jest.Mocked<PublicMethodsOf<ActionsClient>>;
  const savedObjectsClient = {} as jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPromptsByGroupId.mockResolvedValue([
      { promptId: promptDictionary.attackDiscoveryDefault, prompt: 'Default Prompt' },
      { promptId: promptDictionary.attackDiscoveryRefine, prompt: 'Refine Prompt' },
      { promptId: promptDictionary.attackDiscoveryContinue, prompt: 'Continue Prompt' },
      {
        promptId: promptDictionary.attackDiscoveryDetailsMarkdown,
        prompt: 'Details Markdown Prompt',
      },
      {
        promptId: promptDictionary.attackDiscoveryEntitySummaryMarkdown,
        prompt: 'Entity Summary Markdown Prompt',
      },
      {
        promptId: promptDictionary.attackDiscoveryMitreAttackTactics,
        prompt: 'Mitre Attack Tactics Prompt',
      },
      {
        promptId: promptDictionary.attackDiscoverySummaryMarkdown,
        prompt: 'Summary Markdown Prompt',
      },
      { promptId: promptDictionary.attackDiscoveryGenerationTitle, prompt: 'Title Prompt' },
      { promptId: promptDictionary.attackDiscoveryGenerationInsights, prompt: 'Insights Prompt' },
    ]);
  });

  it('should return all prompts', async () => {
    const result = await getAttackDiscoveryPrompts({
      actionsClient,
      connectorId: 'test-connector-id',
      savedObjectsClient,
      model: '2',
      provider: 'gemini',
    });

    expect(mockGetPromptsByGroupId).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'test-connector-id',
        promptGroupId: promptGroupId.attackDiscovery,
        model: '2',
        provider: 'gemini',
        promptIds: [
          promptDictionary.attackDiscoveryDefault,
          promptDictionary.attackDiscoveryRefine,
          promptDictionary.attackDiscoveryContinue,
          promptDictionary.attackDiscoveryDetailsMarkdown,
          promptDictionary.attackDiscoveryEntitySummaryMarkdown,
          promptDictionary.attackDiscoveryMitreAttackTactics,
          promptDictionary.attackDiscoverySummaryMarkdown,
          promptDictionary.attackDiscoveryGenerationTitle,
          promptDictionary.attackDiscoveryGenerationInsights,
        ],
      })
    );

    expect(result).toEqual({
      default: 'Default Prompt',
      refine: 'Refine Prompt',
      continue: 'Continue Prompt',
      detailsMarkdown: 'Details Markdown Prompt',
      entitySummaryMarkdown: 'Entity Summary Markdown Prompt',
      mitreAttackTactics: 'Mitre Attack Tactics Prompt',
      summaryMarkdown: 'Summary Markdown Prompt',
      title: 'Title Prompt',
      insights: 'Insights Prompt',
    });
  });

  it('should return empty strings for missing prompts', async () => {
    mockGetPromptsByGroupId.mockResolvedValue([]);

    const result = await getAttackDiscoveryPrompts({
      actionsClient,
      connectorId: 'test-connector-id',
      savedObjectsClient,
    });

    expect(result).toEqual({
      default: '',
      refine: '',
      continue: '',
      detailsMarkdown: '',
      entitySummaryMarkdown: '',
      mitreAttackTactics: '',
      summaryMarkdown: '',
      title: '',
      insights: '',
    });
  });
});
