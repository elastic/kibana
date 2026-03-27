/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createLeadGenerationEngine } from './lead_generation_engine';
import type { LeadEntity, Observation, ObservationModule } from '../types';

const createMockEntity = (type: string, name: string): LeadEntity => ({
  record: { entity: { id: `euid-${name}`, name, type } } as never,
  type,
  name,
  id: `euid-${name}`,
});

const createMockObservation = (
  entityId: string,
  overrides: Partial<Observation> = {}
): Observation => ({
  entityId,
  moduleId: 'test_module',
  type: 'test_type',
  score: 50,
  severity: 'medium',
  confidence: 0.8,
  description: 'test observation',
  metadata: {},
  ...overrides,
});

const createMockModule = (
  id: string,
  observations: Observation[],
  overrides: Partial<ObservationModule> = {}
): ObservationModule => ({
  config: { id, name: id, priority: 5, weight: 0.5 },
  isEnabled: () => true,
  collect: jest.fn().mockResolvedValue(observations),
  ...overrides,
});

describe('LeadGenerationEngine', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerModule', () => {
    it('registers a module and logs it', () => {
      const engine = createLeadGenerationEngine({ logger });
      const module = createMockModule('mod-a', []);

      engine.registerModule(module);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Registered module'));
    });
  });

  describe('generateLeads', () => {
    it('returns empty array when no entities are provided', async () => {
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', []));

      const leads = await engine.generateLeads([]);

      expect(leads).toEqual([]);
    });

    it('returns empty array when no observations are collected', async () => {
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', []));

      const leads = await engine.generateLeads([createMockEntity('user', 'alice')]);

      expect(leads).toEqual([]);
    });

    it('produces a lead for an entity with observations', async () => {
      const entity = createMockEntity('user', 'alice');
      const obs = createMockObservation('user:euid-alice', { severity: 'high', score: 80 });
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', [obs]));

      const leads = await engine.generateLeads([entity]);

      expect(leads).toHaveLength(1);
      expect(leads[0].entities[0].name).toBe('alice');
      expect(leads[0].priority).toBeGreaterThanOrEqual(1);
      expect(leads[0].priority).toBeLessThanOrEqual(10);
      expect(leads[0].observations).toHaveLength(1);
    });

    it('skips disabled modules', async () => {
      const entity = createMockEntity('user', 'alice');
      const disabledModule = createMockModule(
        'disabled',
        [createMockObservation('user:euid-alice')],
        {
          isEnabled: () => false,
        }
      );
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(disabledModule);

      const leads = await engine.generateLeads([entity]);

      expect(leads).toEqual([]);
      expect(disabledModule.collect).not.toHaveBeenCalled();
    });

    it('continues when a module throws an error', async () => {
      const entity = createMockEntity('user', 'alice');
      const failingModule: ObservationModule = {
        config: { id: 'failing', name: 'failing', priority: 10, weight: 0.5 },
        isEnabled: () => true,
        collect: jest.fn().mockRejectedValue(new Error('boom')),
      };
      const workingObs = createMockObservation('user:euid-alice', { severity: 'high' });
      const workingModule = createMockModule('working', [workingObs]);

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(failingModule);
      engine.registerModule(workingModule);

      const leads = await engine.generateLeads([entity]);

      expect(leads).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Module "failing" failed'));
    });

    it('respects maxLeads config', async () => {
      const entities = Array.from({ length: 5 }, (_, i) => createMockEntity('user', `user-${i}`));
      const observations = entities.map((e) =>
        createMockObservation(`user:${e.id}`, { severity: 'high' })
      );
      const engine = createLeadGenerationEngine({ logger, config: { maxLeads: 2 } });
      engine.registerModule(createMockModule('mod-a', observations));

      const leads = await engine.generateLeads(entities);

      expect(leads.length).toBeLessThanOrEqual(2);
    });

    it('filters entities that do not meet minObservations threshold', async () => {
      const entity = createMockEntity('user', 'alice');
      const obs = createMockObservation('user:euid-alice');
      const engine = createLeadGenerationEngine({ logger, config: { minObservations: 3 } });
      engine.registerModule(createMockModule('mod-a', [obs]));

      const leads = await engine.generateLeads([entity]);

      expect(leads).toEqual([]);
    });

    describe('priority scoring', () => {
      it('assigns priority 1 for a single low severity observation', async () => {
        const entity = createMockEntity('user', 'alice');
        const obs = createMockObservation('user:euid-alice', { severity: 'low' });
        const engine = createLeadGenerationEngine({ logger });
        engine.registerModule(createMockModule('mod-a', [obs]));

        const leads = await engine.generateLeads([entity]);

        expect(leads[0].priority).toBe(1);
      });

      it('assigns priority 5 for a single high severity observation', async () => {
        const entity = createMockEntity('user', 'alice');
        const obs = createMockObservation('user:euid-alice', { severity: 'high' });
        const engine = createLeadGenerationEngine({ logger });
        engine.registerModule(createMockModule('mod-a', [obs]));

        const leads = await engine.generateLeads([entity]);

        expect(leads[0].priority).toBe(5);
      });

      it('assigns priority 7 for a single critical severity observation', async () => {
        const entity = createMockEntity('user', 'alice');
        const obs = createMockObservation('user:euid-alice', { severity: 'critical' });
        const engine = createLeadGenerationEngine({ logger });
        engine.registerModule(createMockModule('mod-a', [obs]));

        const leads = await engine.generateLeads([entity]);

        expect(leads[0].priority).toBe(7);
      });

      it('adds count bonus for multiple observations (capped at +4)', async () => {
        const entity = createMockEntity('user', 'alice');
        const observations = Array.from({ length: 6 }, () =>
          createMockObservation('user:euid-alice', { severity: 'high' })
        );
        const engine = createLeadGenerationEngine({ logger });
        engine.registerModule(createMockModule('mod-a', observations));

        const leads = await engine.generateLeads([entity]);

        // high=5 + min(5, 4) = 9
        expect(leads[0].priority).toBe(9);
      });

      it('caps priority at 10', async () => {
        const entity = createMockEntity('user', 'alice');
        const observations = Array.from({ length: 10 }, () =>
          createMockObservation('user:euid-alice', { severity: 'critical' })
        );
        const engine = createLeadGenerationEngine({ logger });
        engine.registerModule(createMockModule('mod-a', observations));

        const leads = await engine.generateLeads([entity]);

        expect(leads[0].priority).toBe(10);
      });
    });

    it('sorts leads by priority descending', async () => {
      const lowEntity = createMockEntity('user', 'low-user');
      const highEntity = createMockEntity('user', 'high-user');
      const lowObs = createMockObservation('user:euid-low-user', { severity: 'low' });
      const highObs = createMockObservation('user:euid-high-user', { severity: 'critical' });

      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', [lowObs, highObs]));

      const leads = await engine.generateLeads([lowEntity, highEntity]);

      expect(leads[0].entities[0].name).toBe('high-user');
      expect(leads[1].entities[0].name).toBe('low-user');
      expect(leads[0].priority).toBeGreaterThan(leads[1].priority);
    });

    it('sets staleness to fresh for newly generated leads', async () => {
      const entity = createMockEntity('user', 'alice');
      const obs = createMockObservation('user:euid-alice');
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', [obs]));

      const leads = await engine.generateLeads([entity]);

      expect(leads[0].staleness).toBe('fresh');
    });

    it('includes chatRecommendations in generated leads', async () => {
      const entity = createMockEntity('user', 'alice');
      const obs = createMockObservation('user:euid-alice', { moduleId: 'behavioral_analysis' });
      const engine = createLeadGenerationEngine({ logger });
      engine.registerModule(createMockModule('mod-a', [obs]));

      const leads = await engine.generateLeads([entity]);

      expect(leads[0].chatRecommendations.length).toBeGreaterThan(0);
    });
  });
});
