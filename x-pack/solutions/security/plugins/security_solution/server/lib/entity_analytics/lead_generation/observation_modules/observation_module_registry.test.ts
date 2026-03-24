/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Observation } from '../../../../../common/entity_analytics/lead_generation';
import type { ObservationModule, ObservationEntity } from './types';
import { ObservationModuleRegistry } from './observation_module_registry';

const createMockModule = (
  overrides: Partial<ObservationModule> & { id?: string } = {}
): ObservationModule => ({
  config: {
    id: overrides.id ?? 'test_module',
    name: overrides.id ?? 'Test Module',
    priority: 50,
    weight: 1.0,
    ...overrides.config,
  },
  isEnabled: jest.fn().mockReturnValue(true),
  collect: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const createMockEntity = (name: string, type = 'user'): ObservationEntity => ({
  record: { name, type },
  type,
  name,
});

const createMockObservation = (entityId: string, moduleId: string): Observation => ({
  entityId,
  moduleId,
  type: 'test_signal',
  score: 75,
  severity: 'high',
  confidence: 0.9,
  description: 'Test observation',
  metadata: {},
});

describe('ObservationModuleRegistry', () => {
  let registry: ObservationModuleRegistry;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ObservationModuleRegistry(logger);
  });

  describe('register and get', () => {
    it('registers a module and retrieves it by ID', () => {
      const mod = createMockModule({ id: 'risk_score' });
      registry.register(mod);
      expect(registry.get('risk_score')).toBe(mod);
    });

    it('returns undefined for an unregistered module', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('throws when registering a duplicate module ID', () => {
      registry.register(createMockModule({ id: 'alert_analysis' }));

      expect(() => registry.register(createMockModule({ id: 'alert_analysis' }))).toThrow(
        'Observation module "alert_analysis" is already registered'
      );
    });
  });

  describe('getAll', () => {
    it('returns modules sorted by descending priority', () => {
      registry.register(
        createMockModule({
          id: 'low',
          config: { id: 'low', name: 'Low', priority: 10, weight: 1 },
        })
      );
      registry.register(
        createMockModule({
          id: 'high',
          config: { id: 'high', name: 'High', priority: 90, weight: 1 },
        })
      );
      registry.register(
        createMockModule({
          id: 'mid',
          config: { id: 'mid', name: 'Mid', priority: 50, weight: 1 },
        })
      );

      expect(registry.getAll().map((m) => m.config.id)).toEqual(['high', 'mid', 'low']);
    });

    it('returns an empty array when no modules are registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getEnabled', () => {
    it('filters out disabled modules', () => {
      registry.register(createMockModule({ id: 'enabled' }));
      registry.register(
        createMockModule({ id: 'disabled', isEnabled: jest.fn().mockReturnValue(false) })
      );

      const result = registry.getEnabled();
      expect(result).toHaveLength(1);
      expect(result[0].config.id).toBe('enabled');
    });
  });

  describe('evaluate', () => {
    it('collects observations from all enabled modules', async () => {
      const obs1 = createMockObservation('user:alice', 'mod_a');
      const obs2 = createMockObservation('user:alice', 'mod_b');

      registry.register(
        createMockModule({ id: 'mod_a', collect: jest.fn().mockResolvedValue([obs1]) })
      );
      registry.register(
        createMockModule({ id: 'mod_b', collect: jest.fn().mockResolvedValue([obs2]) })
      );

      const results = await registry.evaluate([createMockEntity('alice')]);

      expect(results).toHaveLength(2);
      expect(results).toEqual(expect.arrayContaining([obs1, obs2]));
    });

    it('skips disabled modules during evaluation', async () => {
      registry.register(
        createMockModule({
          id: 'enabled',
          collect: jest.fn().mockResolvedValue([createMockObservation('user:alice', 'enabled')]),
        })
      );
      const disabled = createMockModule({
        id: 'disabled',
        isEnabled: jest.fn().mockReturnValue(false),
        collect: jest.fn(),
      });
      registry.register(disabled);

      const results = await registry.evaluate([createMockEntity('alice')]);

      expect(results).toHaveLength(1);
      expect(disabled.collect).not.toHaveBeenCalled();
    });

    it('continues evaluation when a module throws', async () => {
      registry.register(
        createMockModule({
          id: 'failing',
          config: { id: 'failing', name: 'Failing', priority: 100, weight: 1 },
          collect: jest.fn().mockRejectedValue(new Error('module crash')),
        })
      );
      registry.register(
        createMockModule({
          id: 'working',
          config: { id: 'working', name: 'Working', priority: 50, weight: 1 },
          collect: jest.fn().mockResolvedValue([createMockObservation('user:alice', 'working')]),
        })
      );

      const results = await registry.evaluate([createMockEntity('alice')]);

      expect(results).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Observation module "failing" failed: module crash')
      );
    });

    it('returns an empty array when no modules are registered', async () => {
      expect(await registry.evaluate([createMockEntity('alice')])).toEqual([]);
    });
  });
});
