/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { LeadEntity, Observation, ObservationModule } from '../types';
import { createLeadGenerationEngine } from './lead_generation_engine';
import { llmSynthesizeBatch } from './llm_synthesize';

jest.mock('./llm_synthesize');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockEntity = (name: string, type = 'user'): LeadEntity => ({
  record: { name, type, id: `${type}-${name}` } as unknown as LeadEntity['record'],
  type,
  name,
});

const createMockObservation = (
  entity: LeadEntity,
  moduleId: string,
  overrides: Partial<Observation> = {}
): Observation => ({
  entityId: `${entity.type}:${entity.name}`,
  moduleId,
  type: 'test_signal',
  score: 75,
  severity: 'high',
  confidence: 0.9,
  description: 'Test observation',
  metadata: {},
  ...overrides,
});

const createMockModule = (
  id: string,
  weight: number,
  collectFn: ObservationModule['collect']
): ObservationModule =>
  ({
    config: { id, name: id, priority: 50, weight },
    isEnabled: jest.fn().mockReturnValue(true),
    collect: collectFn,
  } as ObservationModule);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadGenerationEngine', () => {
  const logger = loggingSystemMock.createLogger();
  const mockLlmSynthesizeBatch = llmSynthesizeBatch as jest.MockedFunction<
    typeof llmSynthesizeBatch
  >;
  const fakeChatModel = { invoke: jest.fn() } as unknown as InferenceChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLlmSynthesizeBatch.mockImplementation(async (_model, groups) =>
      groups.map(() => ({
        title: 'LLM title',
        description: 'LLM description',
        tags: ['tag'],
        recommendations: ['recommendation'],
      }))
    );
  });

  // -------------------------------------------------------------------------
  // Weighted scoring formula
  // -------------------------------------------------------------------------

  describe('weighted scoring', () => {
    it('calculates priority from a single observation using the weighted formula', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'risk_analysis', {
        score: 100,
        confidence: 1.0,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // contribution = 0.35 × 100 × 1.0 = 35
      // no bonuses (single observation, single module)
      // normalized = (35 / 100) × 9 + 1 = 4.15 → round = 4
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(4);
    });

    it('applies corroboration bonus for multiple observations from the same module', async () => {
      const entity = createMockEntity('alice');
      const obs1 = createMockObservation(entity, 'risk_analysis', {
        type: 'high_risk_score',
        score: 80,
        confidence: 0.9,
      });
      const obs2 = createMockObservation(entity, 'risk_analysis', {
        type: 'risk_escalation_24h',
        score: 70,
        confidence: 0.8,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs1, obs2]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // obs1 contribution = 0.35 × 80 × 0.9 = 25.2
      // obs2 contribution = 0.35 × 70 × 0.8 = 19.6
      // sum = 44.8
      // corroboration bonus: 44.8 × 1.15 = 51.52
      // normalized = (51.52 / 100) × 9 + 1 = 5.637 → round = 6
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(6);
    });

    it('applies diversity bonus for observations from multiple modules', async () => {
      const entity = createMockEntity('alice');
      const riskObs = createMockObservation(entity, 'risk_analysis', {
        type: 'high_risk_score',
        score: 80,
        confidence: 0.9,
      });
      const alertObs = createMockObservation(entity, 'behavioral_analysis', {
        type: 'high_severity_alerts',
        score: 70,
        confidence: 0.85,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([riskObs]))
      );
      engine.registerModule(
        createMockModule('behavioral_analysis', 0.3, jest.fn().mockResolvedValue([alertObs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // risk contribution = 0.35 × 80 × 0.9 = 25.2
      // alert contribution = 0.30 × 70 × 0.85 = 17.85
      // sum = 43.05
      // no corroboration (1 obs per module)
      // diversity bonus: 43.05 × 1.10 = 47.355
      // normalized = (47.355 / 100) × 9 + 1 = 5.262 → round = 5
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(5);
    });

    it('applies both corroboration and diversity bonuses together', async () => {
      const entity = createMockEntity('alice');
      const risk1 = createMockObservation(entity, 'risk_analysis', {
        type: 'high_risk_score',
        score: 90,
        confidence: 0.95,
      });
      const risk2 = createMockObservation(entity, 'risk_analysis', {
        type: 'risk_escalation_24h',
        score: 80,
        confidence: 0.85,
      });
      const alert = createMockObservation(entity, 'behavioral_analysis', {
        type: 'high_severity_alerts',
        score: 85,
        confidence: 0.9,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([risk1, risk2]))
      );
      engine.registerModule(
        createMockModule('behavioral_analysis', 0.3, jest.fn().mockResolvedValue([alert]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // risk1 = 0.35 × 90 × 0.95 = 29.925
      // risk2 = 0.35 × 80 × 0.85 = 23.8
      // alert = 0.30 × 85 × 0.90 = 22.95
      // sum = 76.675
      // corroboration (risk_analysis has 2 obs): × 1.15 = 88.176
      // diversity (2 modules): × 1.10 = 96.994
      // normalized = (96.994 / 100) × 9 + 1 = 9.729 → round = 10
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(10);
    });

    it('returns priority 1 for a single low-score observation', async () => {
      const entity = createMockEntity('bob');
      const obs = createMockObservation(entity, 'risk_analysis', {
        type: 'low_risk_score',
        score: 20,
        severity: 'low',
        confidence: 0.6,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // contribution = 0.35 × 20 × 0.6 = 4.2
      // normalized = (4.2 / 100) × 9 + 1 = 1.378 → round = 1
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(1);
    });

    it('clamps priority at 10 even with very high raw scores', async () => {
      const entity = createMockEntity('alice');
      const observations = Array.from({ length: 5 }, (_, i) =>
        createMockObservation(entity, 'risk_analysis', {
          type: `signal_${i}`,
          score: 100,
          confidence: 1.0,
        })
      );

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.5, jest.fn().mockResolvedValue(observations))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // 5 × (0.5 × 100 × 1.0) = 250
      // corroboration: 250 × 1.15 = 287.5
      // normalized = (287.5 / 100) × 9 + 1 = 26.875 → clamped to 10
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(10);
    });

    it('handles zero-score observations gracefully', async () => {
      const entity = createMockEntity('carol');
      const obs = createMockObservation(entity, 'risk_analysis', {
        score: 0,
        confidence: 0.5,
        severity: 'low',
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // contribution = 0.35 × 0 × 0.5 = 0
      // normalized = (0 / 100) × 9 + 1 = 1 → round = 1
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(1);
    });

    it('handles zero-confidence observations gracefully', async () => {
      const entity = createMockEntity('dave');
      const obs = createMockObservation(entity, 'risk_analysis', {
        score: 90,
        confidence: 0,
        severity: 'high',
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // contribution = 0.35 × 90 × 0 = 0
      // normalized = 1
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(1);
    });

    it('uses weight=1.0 fallback for observations from unregistered modules', async () => {
      const entity = createMockEntity('eve');
      const obs = createMockObservation(entity, 'unknown_module', {
        score: 50,
        confidence: 0.8,
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('known_module', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // obs.moduleId is 'unknown_module' which is not in moduleWeights
      // fallback weight = 1.0
      // contribution = 1.0 × 50 × 0.8 = 40
      // normalized = (40 / 100) × 9 + 1 = 4.6 → round = 5
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(5);
    });

    it('respects custom bonus and normalization config', async () => {
      const entity = createMockEntity('frank');
      const obs1 = createMockObservation(entity, 'mod_a', {
        score: 60,
        confidence: 1.0,
      });
      const obs2 = createMockObservation(entity, 'mod_b', {
        score: 40,
        confidence: 1.0,
      });

      const engine = createLeadGenerationEngine({
        logger,
        config: {
          corroborationBonus: 0,
          diversityBonus: 0,
          normalizationCeiling: 50,
        },
      });
      engine.registerModule(createMockModule('mod_a', 0.5, jest.fn().mockResolvedValue([obs1])));
      engine.registerModule(createMockModule('mod_b', 0.5, jest.fn().mockResolvedValue([obs2])));

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      // obs1 = 0.5 × 60 × 1.0 = 30
      // obs2 = 0.5 × 40 × 1.0 = 20
      // sum = 50, no bonuses (both set to 0)
      // normalized = (50 / 50) × 9 + 1 = 10
      expect(leads).toHaveLength(1);
      expect(leads[0].priority).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // Orchestrator
  // -------------------------------------------------------------------------

  describe('generateLeads', () => {
    it('returns empty array for no entities', async () => {
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('m', 0.5, jest.fn().mockResolvedValue([])));

      const leads = await engine.generateLeads([], { chatModel: fakeChatModel });
      expect(leads).toEqual([]);
    });

    it('returns empty array when no observations are collected', async () => {
      const entity = createMockEntity('alice');
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('m', 0.5, jest.fn().mockResolvedValue([])));

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });
      expect(leads).toEqual([]);
    });

    it('filters entities below minObservations threshold', async () => {
      const alice = createMockEntity('alice');
      const bob = createMockEntity('bob');

      const aliceObs1 = createMockObservation(alice, 'mod', { score: 80, confidence: 0.9 });
      const aliceObs2 = createMockObservation(alice, 'mod', {
        type: 'second_signal',
        score: 70,
        confidence: 0.8,
      });
      const bobObs = createMockObservation(bob, 'mod', { score: 60, confidence: 0.7 });

      const engine = createLeadGenerationEngine({ logger, config: { minObservations: 2 } });
      engine.registerModule(
        createMockModule('mod', 0.5, jest.fn().mockResolvedValue([aliceObs1, aliceObs2, bobObs]))
      );

      const leads = await engine.generateLeads([alice, bob], { chatModel: fakeChatModel });

      // Bob has only 1 observation, threshold is 2
      expect(leads).toHaveLength(1);
      expect(leads[0].entities[0].name).toBe('alice');
    });

    it('limits output to maxLeads', async () => {
      const entities = Array.from({ length: 5 }, (_, i) => createMockEntity(`entity_${i}`));
      const observations = entities.map((e, idx) =>
        createMockObservation(e, 'mod', { score: 80 - idx * 10, confidence: 0.9 })
      );

      const engine = createLeadGenerationEngine({ logger, config: { maxLeads: 3 } });
      engine.registerModule(
        createMockModule('mod', 0.5, jest.fn().mockResolvedValue(observations))
      );

      const leads = await engine.generateLeads(entities, { chatModel: fakeChatModel });
      expect(leads).toHaveLength(3);
    });

    it('sorts leads by priority descending', async () => {
      const low = createMockEntity('low_risk');
      const high = createMockEntity('high_risk');

      const lowObs = createMockObservation(low, 'mod', {
        score: 20,
        confidence: 0.5,
        severity: 'low',
      });
      const highObs = createMockObservation(high, 'mod', {
        score: 95,
        confidence: 1.0,
        severity: 'critical',
      });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('mod', 0.35, jest.fn().mockResolvedValue([lowObs, highObs]))
      );

      const leads = await engine.generateLeads([low, high], { chatModel: fakeChatModel });
      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads[0].priority).toBeGreaterThanOrEqual(leads[1].priority);
    });

    it('continues when a module throws, collecting observations from other modules', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'working', { score: 80, confidence: 0.9 });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('failing', 0.5, jest.fn().mockRejectedValue(new Error('kaboom')))
      );
      engine.registerModule(createMockModule('working', 0.3, jest.fn().mockResolvedValue([obs])));

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      expect(leads).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Module "failing" failed'));
    });

    it('skips disabled modules', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'enabled', { score: 80, confidence: 0.9 });

      const disabledModule: ObservationModule = {
        config: { id: 'disabled', name: 'disabled', priority: 100, weight: 0.5 },
        isEnabled: jest.fn().mockReturnValue(false),
        collect: jest.fn(),
      } as ObservationModule;

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(disabledModule);
      engine.registerModule(createMockModule('enabled', 0.3, jest.fn().mockResolvedValue([obs])));

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      expect(leads).toHaveLength(1);
      expect(disabledModule.collect).not.toHaveBeenCalled();
    });

    it('sets staleness to fresh for newly generated leads', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'mod', { score: 80, confidence: 0.9 });
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod', 0.5, jest.fn().mockResolvedValue([obs])));

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      expect(leads[0].staleness).toBe('fresh');
    });

    it('includes chatRecommendations in generated leads', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'behavioral_analysis', {
        moduleId: 'behavioral_analysis',
      });
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('behavioral_analysis', 0.3, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      expect(leads[0].chatRecommendations.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // LLM synthesis integration
  // -------------------------------------------------------------------------

  describe('LLM synthesis path', () => {
    it('calls llmSynthesizeBatch with the chatModel', async () => {
      const entity = createMockEntity('alice');
      const obs = createMockObservation(entity, 'risk_analysis', {
        score: 80,
        confidence: 0.9,
      });

      mockLlmSynthesizeBatch.mockResolvedValueOnce([
        {
          title: 'LLM-generated title',
          description: 'LLM-generated description',
          tags: ['credential-access'],
          recommendations: ['Check recent logins for alice'],
        },
      ]);

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      const leads = await engine.generateLeads([entity], { chatModel: fakeChatModel });

      expect(mockLlmSynthesizeBatch).toHaveBeenCalledTimes(1);
      expect(mockLlmSynthesizeBatch).toHaveBeenCalledWith(fakeChatModel, expect.any(Array), logger);
      expect(leads).toHaveLength(1);
      expect(leads[0].title).toBe('LLM-generated title');
      expect(leads[0].description).toBe('LLM-generated description');
      expect(leads[0].tags).toEqual(['credential-access']);
      expect(leads[0].chatRecommendations).toEqual(['Check recent logins for alice']);
    });

    it('propagates LLM synthesis errors to the caller', async () => {
      const entity = createMockEntity('carol');
      const obs = createMockObservation(entity, 'risk_analysis', {
        type: 'high_risk_score',
        score: 90,
        confidence: 0.95,
      });

      mockLlmSynthesizeBatch.mockRejectedValueOnce(new Error('LLM service unavailable'));

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([obs]))
      );

      await expect(engine.generateLeads([entity], { chatModel: fakeChatModel })).rejects.toThrow(
        'LLM service unavailable'
      );
    });

    it('uses LLM results for all leads in a multi-entity batch', async () => {
      const alice = createMockEntity('alice');
      const bob = createMockEntity('bob');

      const aliceObs = createMockObservation(alice, 'risk_analysis', {
        score: 90,
        confidence: 0.9,
      });
      const bobObs = createMockObservation(bob, 'risk_analysis', {
        score: 70,
        confidence: 0.8,
      });

      mockLlmSynthesizeBatch.mockResolvedValueOnce([
        {
          title: 'Alice threat',
          description: 'Alice analysis',
          tags: ['tag-alice'],
          recommendations: ['Investigate alice'],
        },
        {
          title: 'Bob threat',
          description: 'Bob analysis',
          tags: ['tag-bob'],
          recommendations: ['Investigate bob'],
        },
      ]);

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(
        createMockModule('risk_analysis', 0.35, jest.fn().mockResolvedValue([aliceObs, bobObs]))
      );

      const leads = await engine.generateLeads([alice, bob], { chatModel: fakeChatModel });

      expect(mockLlmSynthesizeBatch).toHaveBeenCalledTimes(1);
      expect(leads).toHaveLength(2);
      const titles = leads.map((l) => l.title);
      expect(titles).toContain('Alice threat');
      expect(titles).toContain('Bob threat');
    });
  });
});
