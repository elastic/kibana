/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { LeadEntity, Observation, RelatedEntity, ScoredEntity } from '../types';

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
const { formatLeadsPayload, formatRiskEscalation, formatRelatedEntities, formatPromotionReason } =
  __testables;

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
  obsOverrides?: Partial<Observation>[],
  topRelatedEntities: RelatedEntity[] = [],
  relatedEntityCounts: Record<string, number> = {}
): ScoredEntity => {
  const entity = createMockEntity(name);
  const observations = obsOverrides
    ? obsOverrides.map((o) => createMockObservation(entity, o))
    : [createMockObservation(entity)];
  return { entity, priority, observations, topRelatedEntities, relatedEntityCounts };
};

describe('llmSynthesizeBatch', () => {
  const logger = loggingSystemMock.createLogger();
  const fakeChatModel = {} as unknown as InferenceChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChainInvokeResult = undefined;
  });

  it('returns empty array for empty input', async () => {
    const results = await llmSynthesizeBatch(fakeChatModel, [], logger);
    expect(results).toEqual([]);
  });

  it('throws when LLM returns wrong number of items', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8), createScoredEntity('bob', 6)];

    mockChainInvokeResult = [
      {
        title: 'Only one result',
        description: 'Missing the second',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, entities, logger)).rejects.toThrow(
      /returned 1 items, expected 2/
    );
  });

  it('throws when LLM returns a non-array', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = { title: 'not an array' };

    await expect(llmSynthesizeBatch(fakeChatModel, entities, logger)).rejects.toThrow(
      /returned object items, expected 1/
    );
  });

  it('throws when LLM returns malformed item with missing title', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        description: 'No title field',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, entities, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('throws when LLM returns malformed item with non-array tags', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Valid title',
        description: 'Valid description',
        tags: 'not-an-array',
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, entities, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('truncates titles longer than 10 words', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'This Is A Very Long Title That Should Definitely Be Truncated Now',
        byline: 'Byline',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].title.split(/\s+/).length).toBeLessThanOrEqual(10);
    expect(results[0].title).toBe('This Is A Very Long Title That Should Definitely Be');
  });

  it('keeps hypothesis-style titles up to 9 words intact', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Rapid risk score escalation across privileged admin account',
        byline: 'Byline',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].title).toBe('Rapid risk score escalation across privileged admin account');
  });

  it('renders peer context in the payload when cohort is provided', async () => {
    const entities: ScoredEntity[] = [
      createScoredEntity('alice', 8, [{ type: 'risk_escalation_24h' }]),
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

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger, {
      totalCandidates: 6,
      entityCountByObservationType: { risk_escalation_24h: 5 },
    });

    // The call must still succeed and return the synthesized lead.
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Threat');
  });

  it('throws when LLM returns malformed item with missing byline', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Valid title',
        description: 'No byline field',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    await expect(llmSynthesizeBatch(fakeChatModel, entities, logger)).rejects.toThrow(
      /malformed JSON/
    );
  });

  it('returns the byline and strips markdown formatting from it', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Threat title',
        byline: '**alice** accessed 2 unfamiliar hosts in the last 24h',
        description: 'Description',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].byline).not.toContain('**');
    expect(results[0].byline).toBe('alice accessed 2 unfamiliar hosts in the last 24h');
  });

  it('strips markdown formatting from descriptions', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Threat title',
        byline: 'Byline',
        description: '**Bold text** and *italic text* with `code` and ## heading',
        tags: ['tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].description).not.toContain('**');
    expect(results[0].description).not.toContain('`');
    expect(results[0].description).not.toContain('##');
    expect(results[0].description).toContain('Bold text');
    expect(results[0].description).toContain('code');
  });

  it('filters MITRE ATT&CK IDs from tags', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        byline: 'Byline',
        description: 'Description',
        tags: ['Credential Access', 'T1078', 'Brute Force', 'T1110.003'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].tags).toEqual(['Credential Access', 'Brute Force']);
    expect(results[0].tags).not.toContain('T1078');
    expect(results[0].tags).not.toContain('T1110.003');
  });

  it('caps tags at 6 and recommendations at 5', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        byline: 'Byline',
        description: 'Description',
        tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
        recommendations: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].tags).toHaveLength(6);
    expect(results[0].recommendations).toHaveLength(5);
  });

  it('handles a multi-lead batch correctly preserving order', async () => {
    const entities: ScoredEntity[] = [
      createScoredEntity('alice', 9),
      createScoredEntity('bob', 7),
      createScoredEntity('carol', 5),
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

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('Alice threat');
    expect(results[1].title).toBe('Bob threat');
    expect(results[2].title).toBe('Carol threat');
  });

  it('coerces non-string tag values via String()', async () => {
    const entities: ScoredEntity[] = [createScoredEntity('alice', 8)];

    mockChainInvokeResult = [
      {
        title: 'Threat',
        byline: 'Byline',
        description: 'Description',
        tags: [42, true, 'valid-tag'],
        recommendations: ['rec'],
      },
    ];

    const results = await llmSynthesizeBatch(fakeChatModel, entities, logger);

    expect(results[0].tags).toEqual(['42', 'true', 'valid-tag']);
  });
});

describe('formatLeadsPayload', () => {
  it('renders observation scores as signal_strength, never as a bare score', () => {
    const entities = [createScoredEntity('alice', 8)];

    const payload = formatLeadsPayload(entities);

    expect(payload).toContain('signal_strength=80/100');
    expect(payload).not.toMatch(/[^_]score=\d+\/100/);
  });

  it('omits the Related entities section entirely when the entity has none', () => {
    const entities = [createScoredEntity('alice', 8)];

    const payload = formatLeadsPayload(entities);

    expect(payload).not.toContain('Related entities');
  });

  it('includes the Related entities section when the entity has related entities', () => {
    const entities = [
      createScoredEntity('alice', 8, undefined, [
        { id: 'host:web-01', type: 'host', name: 'web-01', kinds: ['administers'] },
      ]),
    ];

    const payload = formatLeadsPayload(entities);

    expect(payload).toContain('Related entities:');
    expect(payload).toContain('administers host "web-01"');
  });

  it('includes the Promotion reason line when the candidate was promoted', () => {
    const entity: ScoredEntity = {
      ...createScoredEntity('alice', 2),
      promotionReason: 'administers a Critical-risk host',
      promotionConfidence: 'high',
    };

    const payload = formatLeadsPayload([entity]);

    expect(payload).toContain(
      'Promotion reason (confidence: high): administers a Critical-risk host'
    );
  });

  it('omits the Promotion reason line for a normally-scored candidate', () => {
    const entities = [createScoredEntity('alice', 8)];

    const payload = formatLeadsPayload(entities);

    expect(payload).not.toContain('Promotion reason');
  });
});

describe('formatPromotionReason', () => {
  it('returns an empty string when the candidate has no promotion reason', () => {
    expect(formatPromotionReason(createScoredEntity('alice', 8))).toBe('');
  });

  it('renders the reason with confidence when present', () => {
    const entity: ScoredEntity = {
      ...createScoredEntity('alice', 2),
      promotionReason: 'owns a high-criticality database',
      promotionConfidence: 'medium',
    };

    expect(formatPromotionReason(entity)).toBe(
      '  Promotion reason (confidence: medium): owns a high-criticality database'
    );
  });
});

describe('formatRiskEscalation', () => {
  it('returns a Risk escalation line with the exact from/to/delta/window for a 24h escalation', () => {
    const entity = createScoredEntity('alice', 9, [
      {
        type: 'risk_escalation_24h',
        metadata: { previous_score: 22, current_score: 63, delta: 41, window: '24 hours' },
      },
    ]);

    const line = formatRiskEscalation(entity);

    expect(line).toContain('Risk escalation:');
    expect(line).toContain('rose from 22 to 63');
    expect(line).toContain('(+41)');
    expect(line).toContain('24 hours');
  });

  it('returns a Risk escalation line for a 7d escalation', () => {
    const entity = createScoredEntity('bob', 7, [
      {
        type: 'risk_escalation_7d',
        metadata: { previous_score: 30, current_score: 55, delta: 25, window: '7 days' },
      },
    ]);

    const line = formatRiskEscalation(entity);

    expect(line).toContain('Risk escalation:');
    expect(line).toContain('rose from 30 to 55');
  });

  it('picks the escalation with the largest delta when multiple are present', () => {
    const entity = createScoredEntity('carol', 9, [
      {
        type: 'risk_escalation_7d',
        metadata: { previous_score: 30, current_score: 55, delta: 25, window: '7 days' },
      },
      {
        type: 'risk_escalation_24h',
        metadata: { previous_score: 40, current_score: 90, delta: 50, window: '24 hours' },
      },
    ]);

    const line = formatRiskEscalation(entity);

    expect(line).toContain('rose from 40 to 90');
  });

  it('returns an empty string when there is no escalation observation', () => {
    const entity = createScoredEntity('dave', 4, [
      {
        type: 'newly_observed_entity',
        score: 40,
        severity: 'low',
        confidence: 0.6,
        metadata: { days_since_first_seen: 1 },
      },
    ]);

    expect(formatRiskEscalation(entity)).toBe('');
  });

  it('returns an empty string for a 90-day escalation (not a short window)', () => {
    const entity = createScoredEntity('erin', 6, [
      {
        type: 'risk_escalation_90d',
        metadata: { previous_score: 20, current_score: 45, delta: 25, window: '90 days' },
      },
    ]);

    expect(formatRiskEscalation(entity)).toBe('');
  });
});

describe('formatRelatedEntities', () => {
  it('returns an empty string when there are no related entities', () => {
    const entity = createScoredEntity('alice', 8);

    expect(formatRelatedEntities(entity)).toBe('');
  });

  it('renders kind, type, name, criticality, risk, and interaction count in a compact line', () => {
    const entity = createScoredEntity('alice', 8, undefined, [
      {
        id: 'host:web-01',
        type: 'host',
        name: 'web-01',
        kinds: ['administers'],
        criticality: 'extreme_impact',
        riskLevel: 'High',
      },
    ]);

    const section = formatRelatedEntities(entity);

    expect(section).toContain('Related entities:');
    expect(section).toContain(
      '  - administers host "web-01" (criticality: extreme_impact, risk: High)'
    );
  });

  it('renders interactedWithAtLeast as a lower-bound phrase', () => {
    const entity = createScoredEntity('alice', 8, undefined, [
      {
        id: 'host:build-3',
        type: 'host',
        name: 'build-3',
        kinds: ['accesses_infrequently'],
        interactedWithAtLeast: 4,
      },
    ]);

    const section = formatRelatedEntities(entity);

    expect(section).toContain('interacted with: at least 4 entities');
  });

  it('joins multiple kinds for the same entity', () => {
    const entity = createScoredEntity('alice', 8, undefined, [
      {
        id: 'host:shared',
        type: 'host',
        name: 'shared',
        kinds: ['administers', 'communicates_with'],
      },
    ]);

    const section = formatRelatedEntities(entity);

    expect(section).toContain('  - administers, communicates_with host "shared"');
  });

  it('omits the parenthetical when there is no criticality, risk, or interaction count', () => {
    const entity = createScoredEntity('alice', 8, undefined, [
      { id: 'host:bare', type: 'host', name: 'bare', kinds: ['owns'] },
    ]);

    const section = formatRelatedEntities(entity);

    expect(section).toBe('  Related entities:\n  - owns host "bare"');
  });

  it('appends a note when relatedEntityCounts shows more exist for a kind than are shown', () => {
    const entity = createScoredEntity(
      'alice',
      8,
      undefined,
      [{ id: 'host:a', type: 'host', name: 'a', kinds: ['accesses_frequently'] }],
      { accesses_frequently: 22 }
    );

    const section = formatRelatedEntities(entity);

    expect(section).toBe(
      '  Related entities:\n  - accesses_frequently host "a"\n  (not shown: 21 more accesses_frequently relationships)'
    );
  });

  it('does not append a note when relatedEntityCounts matches what was shown', () => {
    const entity = createScoredEntity(
      'alice',
      8,
      undefined,
      [{ id: 'host:a', type: 'host', name: 'a', kinds: ['owns'] }],
      { owns: 1 }
    );

    expect(formatRelatedEntities(entity)).not.toContain('not shown');
  });
});
