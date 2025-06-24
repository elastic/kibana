/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { promptDictionary, getPromptsByGroupId } from '../../../../prompt';
import { getIncompatibleAntivirusPrompt } from './incompatible_antivirus';
import { promptGroupId } from '../../../../prompt/local_prompt_object';

jest.mock('../../../../prompt', () => {
  const original = jest.requireActual('../../../../prompt');
  return {
    ...original,
    getPromptsByGroupId: jest.fn(),
  };
});

const mockGetPromptsByGroupId = getPromptsByGroupId as jest.Mock;

describe('getIncompatibleAntivirusPrompt', () => {
  const actionsClient = {} as jest.Mocked<PublicMethodsOf<ActionsClient>>;
  const savedObjectsClient = {} as jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
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
      actionsClient,
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
          promptDictionary.defendInsightsIncompatibleAntivirusDefault,
          promptDictionary.defendInsightsIncompatibleAntivirusRefine,
          promptDictionary.defendInsightsIncompatibleAntivirusContinue,
          promptDictionary.defendInsightsIncompatibleAntivirusGroup,
          promptDictionary.defendInsightsIncompatibleAntivirusEvents,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
          promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
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
      actionsClient,
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
