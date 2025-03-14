/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { FakeLLM } from '@langchain/core/utils/testing';

import type { GraphState } from '../../types';
import {
  mockAnonymizedEvents,
  mockAnonymizedEventsReplacements,
} from '../../mock/mock_anonymized_events';
import { getChainWithFormatInstructions } from '../helpers/get_chain_with_format_instructions';
import { getDefaultRefinePrompt } from '../refine/helpers/get_default_refine_prompt';
import { getAnonymizedEventsFromState } from './helpers/get_anonymized_events_from_state';
import { getGenerateNode } from '.';

const insightTimestamp = new Date().toISOString();

jest.mock('../helpers/get_chain_with_format_instructions', () => {
  const mockInvoke = jest.fn().mockResolvedValue('');

  return {
    getChainWithFormatInstructions: jest.fn().mockReturnValue({
      chain: {
        invoke: mockInvoke,
      },
      formatInstructions: ['mock format instructions'],
      llmType: 'openai',
      mockInvoke,
    }),
  };
});

const mockLogger = {
  debug: (x: Function) => x(),
} as unknown as Logger;

let mockLlm: ActionsClientLlm;

const initialGraphState: GraphState = {
  prompt: 'test prompt',
  anonymizedEvents: [...mockAnonymizedEvents],
  combinedGenerations: '',
  combinedRefinements: '',
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  insights: null,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: getDefaultRefinePrompt(),
  replacements: mockAnonymizedEventsReplacements,
  unrefinedResults: null,
};

describe('getGenerateNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(insightTimestamp));

    mockLlm = new FakeLLM({
      response: '',
    }) as unknown as ActionsClientLlm;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a function', () => {
    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlm,
      logger: mockLogger,
    });

    expect(typeof generateNode).toBe('function');
  });

  it('invokes the chain with the expected events from state and formatting instructions', async () => {
    const mockInvoke = getChainWithFormatInstructions('incompatible_antivirus', mockLlm).chain
      .invoke as jest.Mock;

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlm,
      logger: mockLogger,
    });

    await generateNode(initialGraphState);

    expect(mockInvoke).toHaveBeenCalledWith({
      format_instructions: ['mock format instructions'],
      query: `${initialGraphState.prompt}

Use context from the following events to provide insights:

"""
${getAnonymizedEventsFromState(initialGraphState).join('\n\n')}
"""
`,
    });
  });

  it('removes the surrounding json from the response', async () => {
    const response =
      'You asked for some JSON, here it is:\n```json\n{"key": "value"}\n```\nI hope that works for you.';

    const mockLlmWithResponse = new FakeLLM({ response }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions('incompatible_antivirus', mockLlmWithResponse)
      .chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(response);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithResponse,
      logger: mockLogger,
    });

    const state = await generateNode(initialGraphState);

    expect(state).toEqual({
      ...initialGraphState,
      combinedGenerations: '{"key": "value"}',
      errors: [
        'generate node is unable to parse (fake) response from attempt 0; (this may be an incomplete response from the model): [\n  {\n    "code": "invalid_type",\n    "expected": "array",\n    "received": "undefined",\n    "path": [\n      "insights"\n    ],\n    "message": "Required"\n  }\n]',
      ],
      generationAttempts: 1,
      generations: ['{"key": "value"}'],
    });
  });

  it('handles hallucinations', async () => {
    const hallucinatedResponse =
      'tactics like **Credential Access**, **Command and Control**, and **Persistence**.",\n      "entitySummaryMarkdown": "Events detected on host **{{ host.name hostNameValue }}**';

    const mockLlmWithHallucination = new FakeLLM({
      response: hallucinatedResponse,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions(
      'incompatible_antivirus',
      mockLlmWithHallucination
    ).chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(hallucinatedResponse);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithHallucination,
      logger: mockLogger,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedGenerations: '{"key": "value"}',
      generationAttempts: 1,
      generations: ['{"key": "value"}'],
    };

    const state = await generateNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedGenerations: '', // <-- reset
      generationAttempts: 2, // <-- incremented
      generations: [], // <-- reset
      hallucinationFailures: 1, // <-- incremented
    });
  });

  it('discards previous generations and starts over when the maxRepeatedGenerations limit is reached', async () => {
    const repeatedResponse = 'gen1';

    const mockLlmWithRepeatedGenerations = new FakeLLM({
      response: repeatedResponse,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions(
      'incompatible_antivirus',
      mockLlmWithRepeatedGenerations
    ).chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(repeatedResponse);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithRepeatedGenerations,
      logger: mockLogger,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedGenerations: 'gen1gen1',
      generationAttempts: 2,
      generations: ['gen1', 'gen1'],
    };

    const state = await generateNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedGenerations: '',
      generationAttempts: 3, // <-- incremented
      generations: [],
    });
  });

  it('combines the response with the previous generations', async () => {
    const response = 'gen1';

    const mockLlmWithResponse = new FakeLLM({
      response,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions('incompatible_antivirus', mockLlmWithResponse)
      .chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(response);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithResponse,
      logger: mockLogger,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedGenerations: 'gen0',
      generationAttempts: 1,
      generations: ['gen0'],
    };

    const state = await generateNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedGenerations: 'gen0gen1',
      errors: [
        'generate node is unable to parse (fake) response from attempt 1; (this may be an incomplete response from the model): SyntaxError: Unexpected token \'g\', "gen0gen1" is not valid JSON',
      ],
      generationAttempts: 2,
      generations: ['gen0', 'gen1'],
    });
  });

  it('returns unrefined results when combined responses pass validation', async () => {
    const rawInsights = JSON.stringify({
      '@timestamp': insightTimestamp,
      insight_type: 'incompatible_antivirus',
      insights: [
        {
          group: 'test_group',
          events: [],
        },
      ],
    });

    const mockLlmWithResponse = new FakeLLM({
      response: rawInsights,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions('incompatible_antivirus', mockLlmWithResponse)
      .chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(rawInsights);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithResponse,
      logger: mockLogger,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedGenerations: '',
      generationAttempts: 0,
      generations: [],
    };

    const state = await generateNode(withPreviousGenerations);
    const expectedResults = [
      {
        group: 'test_group',
        events: [],
        timestamp: insightTimestamp,
      },
    ];

    expect(state).toEqual({
      ...withPreviousGenerations,
      insights: null,
      combinedGenerations: rawInsights,
      errors: [],
      generationAttempts: 1,
      generations: [rawInsights],
      unrefinedResults: expectedResults,
      hallucinationFailures: 0,
    });
  });

  it('skips the refinements step if the max number of retries has already been reached', async () => {
    const rawInsights = JSON.stringify({
      '@timestamp': insightTimestamp,
      insight_type: 'incompatible_antivirus',
      insights: [
        {
          group: 'test_group',
          events: [],
        },
      ],
    });

    const mockLlmWithResponse = new FakeLLM({
      response: rawInsights,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions('incompatible_antivirus', mockLlmWithResponse)
      .chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(rawInsights);

    const generateNode = getGenerateNode({
      insightType: 'incompatible_antivirus',
      llm: mockLlmWithResponse,
      logger: mockLogger,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedGenerations: '',
      generationAttempts: 9, // One away from max
      generations: [],
      hallucinationFailures: 0,
      insights: null,
      unrefinedResults: null,
    };

    const state = await generateNode(withPreviousGenerations);

    const expectedResults = [
      {
        group: 'test_group',
        events: [],
        timestamp: insightTimestamp,
      },
    ];

    expect(state).toEqual({
      ...withPreviousGenerations,
      insights: expectedResults,
      combinedGenerations: rawInsights,
      errors: [],
      generationAttempts: 10,
      generations: [rawInsights],
      unrefinedResults: expectedResults,
      hallucinationFailures: 0,
    });
  });
});
