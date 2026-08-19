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

const { llmSynthesizeBatch, __testables } = jest.requireActual('./llm_synthesize') as {
  llmSynthesizeBatch: typeof import('./llm_synthesize').llmSynthesizeBatch;
  __testables: typeof import('./llm_synthesize').__testables;
};
const { formatLeadsPayload, formatRiskEscalation } = __testables;

const createMockEntity = (name: string, type = 'user'): LeadEntity => {
  const id = `${type}:${name}`;
  return {
    record: { name, type, id } as unknown as LeadEntity['record'],
    id,
    type,
    name,
  };
};

const createMockObservation = (
  entity: LeadEntity,
  overrides: Partial<Observation> = {}
): Observation => ({
  entityId: entity.id,
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

  it('truncates titles longer than 10 words', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'This Is A Very Long Title That Should Definitely Be Truncated Now',
        byline: 'Byline',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].title.split(/\s+/).length).toBeLessThanOrEqual(10);
    expect(results[0].title).toBe('This Is A Very Long Title That Should Definitely Be');
  });

  it('keeps hypothesis-style titles up to 9 words intact', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Rapid risk score escalation across privileged admin account',
        byline: 'Byline',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].title).toBe('Rapid risk score escalation across privileged admin account');
  });

  it('renders peer context in the payload when cohort is provided', async () => {
    const groups: ScoredEntityInput[][] = [
      [createScoredEntity('alice', 8, [{ type: 'risk_escalation_24h' }])],
    ];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        byline: 'Byline',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger, {
      totalCandidates: 6,
      entityCountByObservationType: { risk_escalation_24h: 5 },
    });

    // The call must still succeed and return the synthesized lead.
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Threat');
  });

  it('throws when LLM returns malformed item with missing byline', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Valid title',
        description: 'No byline field',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, groups, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('returns the byline and strips markdown formatting from it', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat title',
        byline: '**alice** accessed 2 unfamiliar hosts in the last 24h',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].byline).not.toContain('**');
    expect(results[0].byline).toBe('alice accessed 2 unfamiliar hosts in the last 24h');
  });

  it('strips markdown formatting from descriptions', async () => {
    const groups: ScoredEntityInput[][] = [[createScoredEntity('alice', 8)]];

    mockChainInvokeResult = [
      {
        title: 'Threat title',
        byline: 'Byline',
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
        byline: 'Byline',
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
        byline: 'Byline',
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
        byline: 'Alice byline',
        description: 'Alice desc',
        tags: ['alice-tag'],
        recommendations: ['alice-rec'],
      },
      {
        title: 'Bob threat',
        byline: 'Bob byline',
        description: 'Bob desc',
        tags: ['bob-tag'],
        recommendations: ['bob-rec'],
      },
      {
        title: 'Carol threat',
        byline: 'Carol byline',
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
        byline: 'Byline',
        description: 'Description',
        tags: [42, true, 'valid-tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, groups, logger);

    expect(results[0].tags).toEqual(['42', 'true', 'valid-tag']);
  });
});

describe('formatLeadsPayload', () => {
  it('renders observation scores as signal_strength, never as a bare score', () => {
    const groups = [[createScoredEntity('alice', 8)]];

    const payload = formatLeadsPayload(groups);

    expect(payload).toContain('signal_strength=80/100');
    expect(payload).not.toMatch(/[^_]score=\d+\/100/);
  });
});

describe('formatRiskEscalation', () => {
  it('returns a Risk escalation line with the exact from/to/delta/window for a 24h escalation', () => {
    const group = [
      createScoredEntity('alice', 9, [
        {
          type: 'risk_escalation_24h',
          metadata: { previous_score: 22, current_score: 63, delta: 41, window: '24 hours' },
        },
      ]),
    ];

    const line = formatRiskEscalation(group);

    expect(line).toContain('Risk escalation:');
    expect(line).toContain('rose from 22 to 63');
    expect(line).toContain('(+41)');
    expect(line).toContain('24 hours');
  });

  it('returns a Risk escalation line for a 7d escalation', () => {
    const group = [
      createScoredEntity('bob', 7, [
        {
          type: 'risk_escalation_7d',
          metadata: { previous_score: 30, current_score: 55, delta: 25, window: '7 days' },
        },
      ]),
    ];

    const line = formatRiskEscalation(group);

    expect(line).toContain('Risk escalation:');
    expect(line).toContain('rose from 30 to 55');
  });

  it('picks the escalation with the largest delta when multiple are present', () => {
    const group = [
      createScoredEntity('carol', 9, [
        {
          type: 'risk_escalation_7d',
          metadata: { previous_score: 30, current_score: 55, delta: 25, window: '7 days' },
        },
        {
          type: 'risk_escalation_24h',
          metadata: { previous_score: 40, current_score: 90, delta: 50, window: '24 hours' },
        },
      ]),
    ];

    const line = formatRiskEscalation(group);

    expect(line).toContain('rose from 40 to 90');
  });

  it('returns an empty string when there is no escalation observation', () => {
    const group = [
      createScoredEntity('dave', 4, [
        {
          type: 'newly_observed_entity',
          score: 40,
          severity: 'low',
          confidence: 0.6,
          metadata: { days_since_first_seen: 1 },
        },
      ]),
    ];

    expect(formatRiskEscalation(group)).toBe('');
  });

  it('returns an empty string for a 90-day escalation (not a short window)', () => {
    const group = [
      createScoredEntity('erin', 6, [
        {
          type: 'risk_escalation_90d',
          metadata: { previous_score: 20, current_score: 45, delta: 25, window: '90 days' },
        },
      ]),
    ];

    expect(formatRiskEscalation(group)).toBe('');
  });
});
