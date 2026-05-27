/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { RuleCreationState } from '../state';

const mockChainInvoke = jest.fn();
const mockJsonParserInvoke = jest.fn();
const mockModelInvoke = jest.fn();
const mockFormatMessages = jest.fn();

jest.mock('./prompts', () => ({
  CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT: {
    pipe: jest.fn(() => ({
      pipe: jest.fn(() => ({
        invoke: mockChainInvoke,
      })),
    })),
    formatMessages: mockFormatMessages,
  },
}));

jest.mock('@langchain/core/output_parsers', () => ({
  JsonOutputParser: jest.fn().mockImplementation(() => ({
    invoke: mockJsonParserInvoke,
  })),
}));

const { createRuleNameAndDescriptionNode } = jest.requireActual(
  './create_rule_name_and_description'
) as typeof import('./create_rule_name_and_description');

const createState = (overrides: Partial<RuleCreationState> = {}): RuleCreationState => ({
  userQuery: 'detect brute force logins',
  rule: {
    query: 'FROM logs-* | LIMIT 10',
    language: 'esql',
    type: 'esql',
  },
  errors: [],
  warnings: [],
  rejectionReason: undefined,
  rejectionMessage: undefined,
  ...overrides,
});

describe('createRuleNameAndDescriptionNode', () => {
  const mockEvents = {
    reportProgress: jest.fn(),
    sendUiEvent: jest.fn(),
  };
  const mockModel = { invoke: mockModelInvoke } as unknown as InferenceChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatMessages.mockResolvedValue([]);
    mockModelInvoke.mockResolvedValue({});
    mockJsonParserInvoke.mockResolvedValue({});
  });

  it('returns rule name and description on first valid model response', async () => {
    mockChainInvoke.mockResolvedValue({
      name: 'Brute Force Login Detection',
      description: 'Detects repeated failed authentication attempts.',
    });

    const node = createRuleNameAndDescriptionNode({ model: mockModel, events: mockEvents });
    const result = await node(createState());

    expect(result).toEqual({
      rule: {
        name: 'Brute Force Login Detection',
        description: 'Detects repeated failed authentication attempts.',
      },
    });
    expect(mockModelInvoke).not.toHaveBeenCalled();
    expect(mockEvents.reportProgress).toHaveBeenCalledWith(
      'Generating rule name and description...'
    );
    expect(mockEvents.reportProgress).toHaveBeenCalledWith(
      'Rule name and description generated successfully'
    );
  });

  it('retries once and succeeds when the second response is valid', async () => {
    mockChainInvoke.mockResolvedValue({ name: '', description: '' });
    mockJsonParserInvoke.mockResolvedValue({
      name: 'Retry Rule Name',
      description: 'Retry rule description.',
    });

    const node = createRuleNameAndDescriptionNode({ model: mockModel, events: mockEvents });
    const result = await node(createState());

    expect(result).toEqual({
      rule: {
        name: 'Retry Rule Name',
        description: 'Retry rule description.',
      },
    });
    expect(mockModelInvoke).toHaveBeenCalledTimes(1);
    expect(mockEvents.reportProgress).toHaveBeenCalledWith(
      'Retrying rule name and description generation with feedback...'
    );
    expect(mockEvents.reportProgress).toHaveBeenCalledWith(
      'Rule name and description generated successfully'
    );
  });

  it('rejects with INVALID_OUTPUT when name and description remain invalid after retry', async () => {
    mockChainInvoke.mockResolvedValue({ name: '   ', description: '' });
    mockJsonParserInvoke.mockResolvedValue({ name: '', description: '   ' });

    const node = createRuleNameAndDescriptionNode({ model: mockModel, events: mockEvents });
    const result = await node(createState());

    expect(result).toEqual({
      rejectionReason: {
        code: 'INVALID_OUTPUT',
        message: 'Generated rule name or description was empty or invalid after retry',
      },
    });
  });

  it('returns an error when ES|QL query is missing', async () => {
    const node = createRuleNameAndDescriptionNode({ model: mockModel, events: mockEvents });
    const result = await node(createState({ rule: { type: 'esql', language: 'esql' } }));

    expect(result).toEqual({
      errors: ['Cannot generate rule name and description: ES|QL query is missing'],
    });
    expect(mockChainInvoke).not.toHaveBeenCalled();
  });

  it('returns an error when the model chain throws', async () => {
    mockChainInvoke.mockRejectedValue(new Error('Model unavailable'));

    const node = createRuleNameAndDescriptionNode({ model: mockModel, events: mockEvents });
    const result = await node(createState());

    expect(result).toEqual({
      errors: ['Failed to create rule name and description: Model unavailable'],
    });
  });
});
