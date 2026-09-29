/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { promptDictionary, getPromptsByGroupId } from '../../prompt';
import { getIncompatibleAntivirusPrompt } from './incompatible_antivirus';
import { promptGroupId } from '../../prompt/local_prompt_object';

vi.mock('../../prompt', async () => {
  const original = (await vi.importActual('../../prompt'));
  return {
    ...original,
    getPromptsByGroupId: vi.fn(),
  };
});

const mockGetPromptsByGroupId = getPromptsByGroupId as Mock;

describe('getIncompatibleAntivirusPrompt', () => {
  const savedObjectsClient = {} as Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPromptsByGroupId.mockResolvedValue([
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusDefault,
        prompt: 'Default Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusRefine,
        prompt: 'Refine Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusContinue,
        prompt: 'Continue Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusGroup,
        prompt: 'Group Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusEvents,
        prompt: 'Events Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
        prompt: 'EventsId Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
        prompt: 'EventsEndpointId Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
        prompt: 'EventsValue Prompt',
      },
    ]);
  });

  it('should return all prompts', async () => {
    const result = await getIncompatibleAntivirusPrompt({
      connectorId: 'test-connector-id',
      savedObjectsClient,
      model: '4',
      provider: 'openai',
    });

    expect(mockGetPromptsByGroupId).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'test-connector-id',
        model: '4',
        provider: 'openai',
        promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
        promptIds: [
          promptDictionary.defendInsightsIncompatibleAntivirusContinue,
          promptDictionary.defendInsightsIncompatibleAntivirusDefault,
          promptDictionary.defendInsightsIncompatibleAntivirusEvents,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
          promptDictionary.defendInsightsIncompatibleAntivirusGroup,
          promptDictionary.defendInsightsIncompatibleAntivirusRefine,
        ],
      })
    );

    expect(result).toEqual({
      default: 'Default Prompt',
      refine: 'Refine Prompt',
      continue: 'Continue Prompt',
      group: 'Group Prompt',
      events: 'Events Prompt',
      eventsId: 'EventsId Prompt',
      eventsEndpointId: 'EventsEndpointId Prompt',
      eventsValue: 'EventsValue Prompt',
    });
  });

  it('should return empty strings for missing prompts', async () => {
    mockGetPromptsByGroupId.mockResolvedValue([]);

    const result = await getIncompatibleAntivirusPrompt({
      connectorId: 'test-connector-id',
      savedObjectsClient,
    });

    expect(result).toEqual({
      default: '',
      refine: '',
      continue: '',
      group: '',
      events: '',
      eventsId: '',
      eventsEndpointId: '',
      eventsValue: '',
    });
  });
});
