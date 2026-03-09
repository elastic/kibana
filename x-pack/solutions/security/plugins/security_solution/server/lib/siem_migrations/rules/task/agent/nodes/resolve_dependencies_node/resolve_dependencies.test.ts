/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResolveDepsNode } from './resolve_dependencies';
import type { MigrateRuleConfig, MigrateRuleState } from '../../types';

jest.mock('../../../../../common/task/util/has_unsupported_function', () => ({
  hasUnsupportedFunctions: jest.fn(),
  UNSUPPORTED_FUNCTIONS: ['UnsupportedFunc_A', 'UnsupportedFunc_B'],
}));

jest.mock('./prompts', () => ({
  QRADAR_DEPENDENCIES_RESOLVE_PROMPT: {
    formatMessages: jest.fn().mockResolvedValue([{ role: 'system', content: 'prompt' }]),
  },
}));

const { hasUnsupportedFunctions } = jest.requireMock(
  '../../../../../common/task/util/has_unsupported_function'
) as { hasUnsupportedFunctions: jest.Mock };

const mockState = {
  original_rule: {
    title: 'Test Rule',
    description: 'Test description',
    query: 'SELECT * FROM events',
  },
  messages: [],
  resources: { lookup: [] },
} as unknown as MigrateRuleState;

const mockConfig = {} as MigrateRuleConfig;

describe('getResolveDepsNode', () => {
  const mockInvoke = jest.fn();
  const node = getResolveDepsNode({ model: { invoke: mockInvoke } as never });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should short-circuit when hasUnsupportedFunctions returns true', async () => {
    hasUnsupportedFunctions.mockReturnValue(true);

    const result = await node(mockState, mockConfig);

    expect(result.nl_query).toBeUndefined();
    expect(result.comments).toHaveLength(1);
    expect(result.comments![0].message).toContain('unsupported functions');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should invoke the model when hasUnsupportedFunctions returns false', async () => {
    hasUnsupportedFunctions.mockReturnValue(false);
    mockInvoke.mockResolvedValue({ text: 'Translated NL query', tool_calls: undefined });

    const result = await node(mockState, mockConfig);

    expect(mockInvoke).toHaveBeenCalled();
    expect(result.nl_query).toBe('Translated NL query');
    expect(result.messages).toHaveLength(1);
    expect(result.comments).toHaveLength(1);
  });
});
