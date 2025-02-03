/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';
import { FakeLLM } from '@langchain/core/utils/testing';

import { getRefineNode } from '.';
import {
  mockAnonymizedAlerts,
  mockAnonymizedAlertsReplacements,
} from '../../../../evaluation/__mocks__/mock_anonymized_alerts';
import { getChainWithFormatInstructions } from '../helpers/get_chain_with_format_instructions';
import { GraphState } from '../../types';
import {
  getParsedAttackDiscoveriesMock,
  getRawAttackDiscoveriesMock,
} from '../../../../../../__mocks__/raw_attack_discoveries';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../../../../../prompt/prompts';

const attackDiscoveryTimestamp = '2024-10-11T17:55:59.702Z';
const prompts = {
  detailsMarkdown: '',
  entitySummaryMarkdown: '',
  mitreAttackTactics: '',
  summaryMarkdown: '',
  title: '',
  insights: '',
};
export const mockUnrefinedAttackDiscoveries: AttackDiscovery[] = [
  {
    title: 'unrefinedTitle1',
    alertIds: ['unrefinedAlertId1', 'unrefinedAlertId2', 'unrefinedAlertId3'],
    timestamp: '2024-10-10T22:59:52.749Z',
    detailsMarkdown: 'unrefinedDetailsMarkdown1',
    summaryMarkdown: 'unrefinedSummaryMarkdown1 - entity A',
    mitreAttackTactics: ['Input Capture'],
    entitySummaryMarkdown: 'entitySummaryMarkdown1',
  },
  {
    title: 'unrefinedTitle2',
    alertIds: ['unrefinedAlertId3', 'unrefinedAlertId4', 'unrefinedAlertId5'],
    timestamp: '2024-10-10T22:59:52.749Z',
    detailsMarkdown: 'unrefinedDetailsMarkdown2',
    summaryMarkdown: 'unrefinedSummaryMarkdown2 - also entity A',
    mitreAttackTactics: ['Credential Access'],
    entitySummaryMarkdown: 'entitySummaryMarkdown2',
  },
];

jest.mock('../helpers/get_chain_with_format_instructions', () => {
  const mockInvoke = jest.fn().mockResolvedValue('');

  return {
    getChainWithFormatInstructions: jest.fn().mockReturnValue({
      chain: {
        invoke: mockInvoke,
      },
      formatInstructions: ['mock format instructions'],
      llmType: 'openai',
      mockInvoke, // <-- added for testing
    }),
  };
});

const mockLogger = loggerMock.create();
let mockLlm: ActionsClientLlm;

const initialGraphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: ATTACK_DISCOVERY_DEFAULT,
  anonymizedAlerts: [...mockAnonymizedAlerts],
  combinedGenerations: 'gen1',
  combinedRefinements: '',
  continuePrompt: ATTACK_DISCOVERY_CONTINUE,
  errors: [],
  generationAttempts: 1,
  generations: ['gen1'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: ATTACK_DISCOVERY_REFINE,
  replacements: {
    ...mockAnonymizedAlertsReplacements,
  },
  unrefinedResults: [...mockUnrefinedAttackDiscoveries],
};

describe('getRefineNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(attackDiscoveryTimestamp));

    mockLlm = new FakeLLM({
      response: '',
    }) as unknown as ActionsClientLlm;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a function', () => {
    const refineNode = getRefineNode({
      llm: mockLlm,
      logger: mockLogger,
      prompts,
    });

    expect(typeof refineNode).toBe('function');
  });

  it('invokes the chain with the unrefinedResults from state and format instructions', async () => {
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlm, prompts }).chain
      .invoke as jest.Mock;

    const refineNode = getRefineNode({
      llm: mockLlm,
      logger: mockLogger,
      prompts,
    });

    await refineNode(initialGraphState);

    expect(mockInvoke).toHaveBeenCalledWith({
      format_instructions: ['mock format instructions'],
      query: `${initialGraphState.attackDiscoveryPrompt}

${ATTACK_DISCOVERY_REFINE}

\"\"\"
${JSON.stringify(initialGraphState.unrefinedResults, null, 2)}
\"\"\"

`,
    });
  });

  it('removes the surrounding json from the response', async () => {
    const response =
      'You asked for some JSON, here it is:\n```json\n{"key": "value"}\n```\nI hope that works for you.';

    const mockLlmWithResponse = new FakeLLM({ response }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlmWithResponse, prompts }).chain
      .invoke as jest.Mock;

    mockInvoke.mockResolvedValue(response);

    const refineNode = getRefineNode({
      llm: mockLlm,
      logger: mockLogger,
      prompts,
    });

    const state = await refineNode(initialGraphState);

    expect(state).toEqual({
      ...initialGraphState,
      combinedRefinements: '{"key": "value"}',
      errors: [
        'refine node is unable to parse (fake) response from attempt 1; (this may be an incomplete response from the model): [\n  {\n    "code": "invalid_type",\n    "expected": "array",\n    "received": "undefined",\n    "path": [\n      "insights"\n    ],\n    "message": "Required"\n  }\n]',
      ],
      generationAttempts: 2,
      refinements: ['{"key": "value"}'],
    });
  });

  it('handles hallucinations', async () => {
    const hallucinatedResponse =
      'tactics like **Credential Access**, **Command and Control**, and **Persistence**.",\n      "entitySummaryMarkdown": "Malware detected on host **{{ host.name hostNameValue }}**';

    const mockLlmWithHallucination = new FakeLLM({
      response: hallucinatedResponse,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlmWithHallucination, prompts })
      .chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(hallucinatedResponse);

    const refineNode = getRefineNode({
      llm: mockLlmWithHallucination,
      logger: mockLogger,
      prompts,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedRefinements: '{"key": "value"}',
      refinements: ['{"key": "value"}'],
    };

    const state = await refineNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedRefinements: '', // <-- reset
      generationAttempts: 2, // <-- incremented
      refinements: [], // <-- reset
      hallucinationFailures: 1, // <-- incremented
    });
  });

  it('discards previous refinements and starts over when the maxRepeatedGenerations limit is reached', async () => {
    const repeatedResponse = '{"key": "value"}';

    const mockLlmWithRepeatedGenerations = new FakeLLM({
      response: repeatedResponse,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({
      llm: mockLlmWithRepeatedGenerations,
      prompts,
    }).chain.invoke as jest.Mock;

    mockInvoke.mockResolvedValue(repeatedResponse);

    const refineNode = getRefineNode({
      llm: mockLlmWithRepeatedGenerations,
      logger: mockLogger,
      prompts,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedRefinements: '{"key": "value"}{"key": "value"}',
      generationAttempts: 3,
      refinements: ['{"key": "value"}', '{"key": "value"}'],
    };

    const state = await refineNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedRefinements: '',
      generationAttempts: 4, // <-- incremented
      refinements: [],
    });
  });

  it('combines the response with the previous refinements', async () => {
    const response = 'refine1';

    const mockLlmWithResponse = new FakeLLM({
      response,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlmWithResponse, prompts }).chain
      .invoke as jest.Mock;

    mockInvoke.mockResolvedValue(response);

    const refineNode = getRefineNode({
      llm: mockLlmWithResponse,
      logger: mockLogger,
      prompts,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedRefinements: 'refine0',
      generationAttempts: 2,
      refinements: ['refine0'],
    };

    const state = await refineNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      combinedRefinements: 'refine0refine1',
      errors: [
        'refine node is unable to parse (fake) response from attempt 2; (this may be an incomplete response from the model): SyntaxError: Unexpected token \'r\', "refine0refine1" is not valid JSON',
      ],
      generationAttempts: 3,
      refinements: ['refine0', 'refine1'],
    });
  });

  it('returns refined results when combined responses pass validation', async () => {
    // split the response into two parts to simulate a valid response
    const splitIndex = 100; // arbitrary index
    const firstResponse = getRawAttackDiscoveriesMock().slice(0, splitIndex);
    const secondResponse = getRawAttackDiscoveriesMock().slice(splitIndex);

    const mockLlmWithResponse = new FakeLLM({
      response: secondResponse,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlmWithResponse, prompts }).chain
      .invoke as jest.Mock;

    mockInvoke.mockResolvedValue(secondResponse);

    const refineNode = getRefineNode({
      llm: mockLlmWithResponse,
      logger: mockLogger,
      prompts,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedRefinements: firstResponse,
      generationAttempts: 2,
      refinements: [firstResponse],
    };

    const state = await refineNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      attackDiscoveries: getParsedAttackDiscoveriesMock(attackDiscoveryTimestamp),
      combinedRefinements: firstResponse.concat(secondResponse),
      generationAttempts: 3,
      refinements: [firstResponse, secondResponse],
    });
  });

  it('uses the unrefined results when the max number of retries has already been reached', async () => {
    const response = 'this will not pass JSON parsing';

    const mockLlmWithResponse = new FakeLLM({
      response,
    }) as unknown as ActionsClientLlm;
    const mockInvoke = getChainWithFormatInstructions({ llm: mockLlmWithResponse, prompts }).chain
      .invoke as jest.Mock;

    mockInvoke.mockResolvedValue(response);

    const refineNode = getRefineNode({
      llm: mockLlmWithResponse,
      logger: mockLogger,
      prompts,
    });

    const withPreviousGenerations = {
      ...initialGraphState,
      combinedRefinements: 'refine1',
      generationAttempts: 9,
      refinements: ['refine1'],
    };

    const state = await refineNode(withPreviousGenerations);

    expect(state).toEqual({
      ...withPreviousGenerations,
      attackDiscoveries: state.unrefinedResults, // <-- the unrefined results are returned
      combinedRefinements: 'refine1this will not pass JSON parsing',
      errors: [
        'refine node is unable to parse (fake) response from attempt 9; (this may be an incomplete response from the model): SyntaxError: Unexpected token \'r\', "refine1thi"... is not valid JSON',
      ],
      generationAttempts: 10,
      refinements: ['refine1', response],
    });
  });
});
