/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { promptDictionary, getPromptsByGroupId } from '../../../../prompt';
import { getPolicyResponseFailurePrompt } from './policy_response_failure';
import { promptGroupId } from '../../../../prompt/local_prompt_object';

jest.mock('../../../../prompt', () => {
  const original = jest.requireActual('../../../../prompt');
  return {
    ...original,
    getPromptsByGroupId: jest.fn(),
  };
});

const mockGetPromptsByGroupId = getPromptsByGroupId as jest.Mock;

describe('getPolicyResponseFailurePrompt', () => {
  const actionsClient = {} as jest.Mocked<PublicMethodsOf<ActionsClient>>;
  const savedObjectsClient = {} as jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPromptsByGroupId.mockResolvedValue([
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureDefault,
        prompt: 'Default Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureRefine,
        prompt: 'Refine Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureContinue,
        prompt: 'Continue Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureGroup,
        prompt: 'Group Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureEvents,
        prompt: 'Events Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureEventsId,
        prompt: 'EventsId Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId,
        prompt: 'EventsEndpointId Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureEventsValue,
        prompt: 'EventsValue Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureRemediation,
        prompt: 'Remediation Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage,
        prompt: 'Remediation Message Prompt',
      },
      {
        promptId: promptDictionary.defendInsightsPolicyResponseFailureRemediationLink,
        prompt: 'Remediation Link Prompt',
      },
    ]);
  });

  it('should return all prompts', async () => {
    const result = await getPolicyResponseFailurePrompt({
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
        promptGroupId: promptGroupId.defendInsights.policyResponseFailure,
        promptIds: [
          promptDictionary.defendInsightsPolicyResponseFailureDefault,
          promptDictionary.defendInsightsPolicyResponseFailureRefine,
          promptDictionary.defendInsightsPolicyResponseFailureContinue,
          promptDictionary.defendInsightsPolicyResponseFailureGroup,
          promptDictionary.defendInsightsPolicyResponseFailureEvents,
          promptDictionary.defendInsightsPolicyResponseFailureEventsId,
          promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId,
          promptDictionary.defendInsightsPolicyResponseFailureEventsValue,
          promptDictionary.defendInsightsPolicyResponseFailureRemediation,
          promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage,
          promptDictionary.defendInsightsPolicyResponseFailureRemediationLink,
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
      remediation: 'Remediation Prompt',
      remediationMessage: 'Remediation Message Prompt',
      remediationLink: 'Remediation Link Prompt',
    });
  });

  it('should return empty strings for missing prompts', async () => {
    mockGetPromptsByGroupId.mockResolvedValue([]);

    const result = await getPolicyResponseFailurePrompt({
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
      remediation: '',
      remediationMessage: '',
      remediationLink: '',
    });
  });
});
