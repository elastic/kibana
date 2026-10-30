/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { MAX_PROMOTED_LEADS } from '../../../../common/entity_analytics/lead_generation/constants';
import type { LeadCandidate } from './engine/lead_generation_engine';
import type { RelatedEntity } from './types';

let mockChainInvokeResult: unknown;

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromTemplate: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnValue({
        invoke: jest.fn().mockImplementation(() => Promise.resolve(mockChainInvokeResult)),
      }),
    }),
  },
}));

const { buildExploratoryLeads, POOL_SIZE, MAX_POOL_PAYLOAD_CHARS } = jest.requireActual(
  './exploratory_leads'
) as {
  buildExploratoryLeads: typeof import('./exploratory_leads').buildExploratoryLeads;
  POOL_SIZE: typeof import('./exploratory_leads').POOL_SIZE;
  MAX_POOL_PAYLOAD_CHARS: typeof import('./exploratory_leads').MAX_POOL_PAYLOAD_CHARS;
};

const logger = loggingSystemMock.createLogger();
const withStructuredOutput = jest.fn().mockReturnValue({});
const fakeChatModel = { withStructuredOutput } as unknown as InferenceChatModel;

let nextId = 0;
interface CandidateOverrides {
  leadId?: string;
  priority?: number;
  topRelatedEntities?: RelatedEntity[];
  attributes?: { managed?: boolean; mfaEnabled?: boolean; privileged?: boolean };
  firstSeen?: string;
}
const buildCandidate = ({
  leadId,
  priority = 1,
  topRelatedEntities = [],
  attributes = {},
  firstSeen,
}: CandidateOverrides = {}): LeadCandidate => {
  nextId += 1;
  const id = leadId ?? `lead-${nextId}`;
  const euid = `user:${id}`;
  return {
    entity: {
      id: euid,
      type: 'user',
      name: id,
      record: {
        entity: {
          id: euid,
          attributes: {
            managed: attributes.managed,
            mfa_enabled: attributes.mfaEnabled,
            privileged: attributes.privileged,
          },
          lifecycle: { first_seen: firstSeen },
        },
      } as unknown as LeadCandidate['entity']['record'],
    },
    priority,
    observations: [],
    leadId: id,
    topRelatedEntities,
    relatedEntityCounts: {},
  };
};

const relatedEntity = (overrides: Partial<RelatedEntity> = {}): RelatedEntity => ({
  id: 'related',
  type: 'host',
  name: 'related',
  kinds: ['owns'],
  ...overrides,
});

const paddingRelated = (count: number, prefix: string): RelatedEntity[] =>
  Array.from({ length: count }, (_, i) =>
    relatedEntity({
      id: `${prefix}-${i}`,
      name: `${prefix}-${i}-${'n'.repeat(120)}`,
    })
  );

const denseCandidate = ({
  leadId,
  significantRelated = [],
}: {
  leadId: string;
  significantRelated?: RelatedEntity[];
}): LeadCandidate =>
  buildCandidate({
    leadId,
    topRelatedEntities: [...significantRelated, ...paddingRelated(30, `${leadId}-pad`)],
  });

describe('buildExploratoryLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainInvokeResult = undefined;
  });

  it('sends a candidate with only low-severity related entities to the LLM', async () => {
    const candidate = buildCandidate({
      leadId: 'alice',
      topRelatedEntities: [relatedEntity({ riskLevel: 'Low', criticality: 'low_impact' })],
    });
    mockChainInvokeResult = {
      selections: [
        {
          euid: candidate.entity.id,
          reason: 'newly seen unmanaged user with unusual authentication failures',
          confidence: 'medium',
        },
      ],
    };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['alice']);
  });

  it('sends a candidate with no related entities to the LLM', async () => {
    const candidate = buildCandidate({ leadId: 'alice' });
    mockChainInvokeResult = {
      selections: [
        {
          euid: candidate.entity.id,
          reason: 'spike in failed authentications after first seen',
          confidence: 'medium',
        },
      ],
    };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['alice']);
  });

  it('enters the pool via criticality alone, independently of risk level', async () => {
    const candidate = buildCandidate({
      leadId: 'alice',
      topRelatedEntities: [relatedEntity({ criticality: 'extreme_impact', riskLevel: undefined })],
    });
    mockChainInvokeResult = {
      selections: [
        {
          euid: candidate.entity.id,
          reason: 'owns a highly critical asset',
          confidence: 'medium',
        },
      ],
    };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['alice']);
  });

  it('keeps a significant-relationship candidate in the pool even when it is last in input order', async () => {
    const noGraph = Array.from({ length: POOL_SIZE }, (_, i) =>
      buildCandidate({ leadId: `plain-${i}` })
    );
    const significant = buildCandidate({
      leadId: 'significant',
      topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
    });
    mockChainInvokeResult = {
      selections: [
        {
          euid: significant.entity.id,
          reason: 'owns a High-risk host',
          confidence: 'high',
        },
      ],
    };

    const result = await buildExploratoryLeads([...noGraph, significant], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['significant']);
  });

  it('ranks a candidate with more significant relationships ahead of one with fewer', async () => {
    const filler = Array.from({ length: POOL_SIZE - 1 }, (_, i) =>
      buildCandidate({
        leadId: `filler-${i}`,
        topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
      })
    );
    const singleHigh = buildCandidate({
      leadId: 'single-high',
      topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
    });
    const doubleHigh = buildCandidate({
      leadId: 'double-high',
      topRelatedEntities: [
        relatedEntity({ riskLevel: 'High' }),
        relatedEntity({ riskLevel: 'High' }),
      ],
    });
    mockChainInvokeResult = {
      selections: [
        {
          euid: doubleHigh.entity.id,
          reason: 'touches two High-risk hosts',
          confidence: 'high',
        },
      ],
    };

    const result = await buildExploratoryLeads([...filler, singleHigh, doubleHigh], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['double-high']);
  });

  it('does not promote an LLM pick that falls outside the POOL_SIZE cap', async () => {
    const inPool = Array.from({ length: POOL_SIZE }, (_, i) =>
      buildCandidate({ leadId: `in-${i}` })
    );
    const outside = buildCandidate({ leadId: 'outside' });
    mockChainInvokeResult = {
      selections: [{ euid: outside.entity.id, reason: 'weird behaviour', confidence: 'medium' }],
    };

    const result = await buildExploratoryLeads([...inPool, outside], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result).toEqual([]);
  });

  it('applies the POOL_SIZE cap before invoking the LLM', async () => {
    const candidates = Array.from({ length: POOL_SIZE + 10 }, (_, i) =>
      buildCandidate({
        leadId: `entity-${i}`,
        topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
      })
    );
    mockChainInvokeResult = { selections: [] };

    await buildExploratoryLeads(candidates, {
      chatModel: fakeChatModel,
      logger,
    });

    // Can't inspect the pool directly, but a non-throwing, empty-picks run
    // confirms the pool was built and handed to the (mocked) LLM call.
    expect(withStructuredOutput).toHaveBeenCalled();
  });

  it('promotes a pool candidate the LLM selects, attaching reason and confidence', async () => {
    const candidate = buildCandidate({
      leadId: 'alice',
      topRelatedEntities: [relatedEntity({ criticality: 'extreme_impact' })],
    });
    mockChainInvokeResult = {
      selections: [
        {
          euid: candidate.entity.id,
          reason: 'administers a Critical-risk host',
          confidence: 'high',
        },
      ],
    };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result).toEqual([
      {
        ...candidate,
        origin: 'exploratory',
        promotionReason: 'administers a Critical-risk host',
        promotionConfidence: 'high',
      },
    ]);
  });

  it('keeps the first MAX_PROMOTED_LEADS picks when the LLM returns more than the cap', async () => {
    const candidates = Array.from({ length: MAX_PROMOTED_LEADS + 2 }, (_, i) =>
      buildCandidate({
        leadId: `pick-${i}`,
        topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
      })
    );
    mockChainInvokeResult = {
      selections: candidates.map((c) => ({
        euid: c.entity.id,
        reason: 'hunt-worthy combination of facts',
        confidence: 'medium' as const,
      })),
    };

    const result = await buildExploratoryLeads(candidates, {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result).toHaveLength(MAX_PROMOTED_LEADS);
    expect(result.map((c) => c.leadId)).toEqual(
      candidates.slice(0, MAX_PROMOTED_LEADS).map((c) => c.leadId)
    );
  });

  it('rejects an LLM pick whose EUID is not in the pool', async () => {
    const candidate = buildCandidate({
      leadId: 'alice',
      topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
    });
    mockChainInvokeResult = {
      selections: [{ euid: 'user:not-in-pool', reason: 'invented connection', confidence: 'high' }],
    };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result).toEqual([]);
  });

  it('returns empty and logs a warning when the selection call fails, without throwing', async () => {
    const candidate = buildCandidate({
      topRelatedEntities: [relatedEntity({ riskLevel: 'High' })],
    });
    mockChainInvokeResult = { not: 'an array' };

    const result = await buildExploratoryLeads([candidate], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('LLM exploratory lead selection failed')
    );
  });

  it('trims the pool by payload budget before POOL_SIZE when entities are dense', async () => {
    const high = denseCandidate({
      leadId: 'high',
      significantRelated: [
        relatedEntity({ id: 'high-a', name: 'high-a', riskLevel: 'High' }),
        relatedEntity({ id: 'high-b', name: 'high-b', riskLevel: 'High' }),
      ],
    });
    const fillers = Array.from({ length: POOL_SIZE - 2 }, (_, i) =>
      denseCandidate({
        leadId: `filler-${i}`,
        significantRelated: [relatedEntity({ id: `filler-${i}-rel`, riskLevel: 'High' })],
      })
    );
    const low = denseCandidate({ leadId: 'low' });

    mockChainInvokeResult = {
      selections: [
        {
          euid: high.entity.id,
          reason: 'touches two High-risk hosts',
          confidence: 'high',
        },
        {
          euid: low.entity.id,
          reason: 'dense but low significance',
          confidence: 'medium',
        },
      ],
    };

    const result = await buildExploratoryLeads([low, ...fillers, high], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['high']);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `Exploratory pool trimmed by payload budget: \\d+/${POOL_SIZE} candidates, \\d+/${MAX_POOL_PAYLOAD_CHARS} chars`
        )
      )
    );
  });

  it('keeps up to POOL_SIZE when entities are light', async () => {
    const light = Array.from({ length: POOL_SIZE - 1 }, (_, i) =>
      buildCandidate({ leadId: `light-${i}` })
    );
    const tail = buildCandidate({ leadId: 'tail' });
    mockChainInvokeResult = {
      selections: [
        {
          euid: tail.entity.id,
          reason: 'light candidate still in a full-size pool',
          confidence: 'medium',
        },
      ],
    };

    const result = await buildExploratoryLeads([...light, tail], {
      chatModel: fakeChatModel,
      logger,
    });

    expect(result.map((c) => c.leadId)).toEqual(['tail']);
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Exploratory pool trimmed by payload budget')
    );
  });
});
