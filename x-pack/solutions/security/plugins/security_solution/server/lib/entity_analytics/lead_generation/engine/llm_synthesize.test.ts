/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { LeadEntity, Observation } from '../types';
import type { ScoredEntityInput } from './llm_synthesize';

let mockChainInvokeResult: unknown;

jest.mock('@langchain/core/output_parsers', () => ({
  JsonOutputParser: jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
  })),
}));

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromTemplate: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          invoke: jest.fn().mockImplementation(() => Promise.resolve(mockChainInvokeResult)),
        }),
      }),
    }),
  },
}));

const { llmSynthesizeBatch } = jest.requireActual('./llm_synthesize') as {
  llmSynthesizeBatch: typeof import('./llm_synthesize').llmSynthesizeBatch;
};

const createMockEntity = (name: string, type = 'user'): LeadEntity => ({
  record: { name, type, id: `${type}-${name}` } as unknown as LeadEntity['record'],
  type,
  name,
});

const createMockObservation = (
  entity: LeadEntity,
  overrides: Partial<Observation> = {}
): Observation => ({
  entityId: `${entity.type}:${entity.name}`,
  moduleId: 'risk_analysis',
  type: 'high_risk_score',
  score: 80,
  severity: 'high',
  confidence: 0.9,
  description: 'Entity has a high risk score',
  metadata: { calculated_score_norm: 82 },
  ...overrides,
});

const createScoredEntity = (
  name: string,
  priority: number,
  obsOverrides?: Partial<Observation>[]
): ScoredEntityInput => {
  const entity = createMockEntity(name);
  const observations = obsOverrides
    ? obsOverrides.map((o) => createMockObservation(entity, o))
    : [createMockObservation(entity)];
  return { entity, priority, observations };
};

describe('llmSynthesizeBatch', () => {
  const logger = loggingSystemMock.createLogger();
  const fakeChatModel = {} as unknown as InferenceChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChainInvokeResult = undefined;
  });

  it('returns empty array for empty groups', async () => {
    const results = await llmSynthesizeBatch(fakeChatModel, [], logger);
    expect(results).toEqual([]);
  });

  it('throws when LLM returns wrong number of items', async () => {
    const groups: ScoredEntityInput[][] = [
      [createScoredEntity('alice', 8)],
      [createScoredEntity('bob', 6)],
    ];

    mockChainInvokeResult = [
      {
        title: 'Only one result',
        description: 'Missing the second',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, groups, logger)).rejects.toThrow(
      /returned 1 items, expected 2/
    );
  });

  it('throws when LLM returns a non-array', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = { title: 'not an array' };

    await expect(llmSynthesizeBatch(fakeChatModel, groups, logger)).rejects.toThrow(
      /returned object items, expected 1/
    );
  });

  it('throws when LLM returns malformed item with missing title', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        description: 'No title field',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, groups, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('throws when LLM returns malformed item with non-array tags', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Valid title',
        description: 'Valid description',
        tags: 'not-an-array',
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, groups, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('truncates titles longer than 5 words', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'This Is A Very Long Title That Should Be Truncated',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].title.split(/\s+/).length).toBeLessThanOrEqual(5);
    expect(results[0].title).toBe('This Is A Very Long');
  });

  it('strips markdown formatting from descriptions', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat title',
        description: '**Bold text** and *italic text* with `code` and ## heading',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].description).not.toContain('**');
    expect(results[0].description).not.toContain('`');
    expect(results[0].description).not.toContain('##');
    expect(results[0].description).toContain('Bold text');
    expect(results[0].description).toContain('code');
  });

  it('filters MITRE ATT&CK IDs from tags', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        description: 'Description',
        tags: ['Credential Access', 'T1078', 'Brute Force', 'T1110.003'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].tags).toEqual(['Credential Access', 'Brute Force']);
    expect(results[0].tags).not.toContain('T1078');
    expect(results[0].tags).not.toContain('T1110.003');
  });

  it('caps tags at 6 and recommendations at 5', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        description: 'Description',
        tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
        recommendations: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].tags).toHaveLength(6);
    expect(results[0].recommendations).toHaveLength(5);
  });

  it('handles a multi-lead batch correctly preserving order', async () => {
    const groups: ScoredEntityInput[][] = [
      [createScoredEntity('alice', 9)],
      [createScoredEntity('bob', 7)],
      [createScoredEntity('carol', 5)],
    ];

    mockChainInvokeResult = [
      {
        title: 'Alice threat',
        description: 'Alice desc',
        tags: ['alice-tag'],
        recommendations: ['alice-rec'],
      },
      {
        title: 'Bob threat',
        description: 'Bob desc',
        tags: ['bob-tag'],
        recommendations: ['bob-rec'],
      },
      {
        title: 'Carol threat',
        description: 'Carol desc',
        tags: ['carol-tag'],
        recommendations: ['carol-rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('Alice threat');
    expect(results[1].title).toBe('Bob threat');
    expect(results[2].title).toBe('Carol threat');
  });

  it('coerces non-string tag values via String()', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        description: 'Description',
        tags: [42, true, 'valid-tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].tags).toEqual(['42', 'true', 'valid-tag']);
  });
});
