/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { persistDiscoveriesStepPublicDefinition } from './persist_discoveries_step';
import { PersistDiscoveriesStepTypeId } from '../../common/step_types/persist_discoveries_step';

describe('persistDiscoveriesStepPublicDefinition', () => {
  describe('id', () => {
    it('returns the correct id', () => {
      expect(persistDiscoveriesStepPublicDefinition.id).toBe(PersistDiscoveriesStepTypeId);
    });

    it('returns attack-discovery.persistDiscoveries', () => {
      expect(persistDiscoveriesStepPublicDefinition.id).toBe(
        'security.attack-discovery.persistDiscoveries'
      );
    });
  });

  describe('label', () => {
    it('is defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.label).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof persistDiscoveriesStepPublicDefinition.label).toBe('string');
    });

    it('is not empty', () => {
      expect(persistDiscoveriesStepPublicDefinition.label.length).toBeGreaterThan(0);
    });
  });

  describe('description', () => {
    it('is defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.description).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof persistDiscoveriesStepPublicDefinition.description).toBe('string');
    });

    it('is not empty', () => {
      expect(persistDiscoveriesStepPublicDefinition.description?.length).toBeGreaterThan(0);
    });
  });

  describe('icon', () => {
    it('is defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.icon).toBeDefined();
    });
  });

  describe('category', () => {
    it('is set to Kibana', () => {
      expect(persistDiscoveriesStepPublicDefinition.category).toBe(StepCategory.Kibana);
    });
  });

  describe('schemas', () => {
    it('has inputSchema defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.inputSchema).toBeDefined();
    });

    it('has outputSchema defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.outputSchema).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('is defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.documentation).toBeDefined();
    });

    it('has details defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.documentation?.details).toBeDefined();
    });

    it('has details as a string', () => {
      expect(typeof persistDiscoveriesStepPublicDefinition.documentation?.details).toBe('string');
    });

    it('has non-empty details', () => {
      expect(persistDiscoveriesStepPublicDefinition.documentation?.details?.length).toBeGreaterThan(
        0
      );
    });

    it('has examples defined', () => {
      expect(persistDiscoveriesStepPublicDefinition.documentation?.examples).toBeDefined();
    });

    it('has examples as an array', () => {
      expect(Array.isArray(persistDiscoveriesStepPublicDefinition.documentation?.examples)).toBe(
        true
      );
    });

    it('has at least one example', () => {
      expect(
        persistDiscoveriesStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThan(0);
    });

    it('has at least 3 examples', () => {
      expect(
        persistDiscoveriesStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('documentation examples', () => {
    const examples = persistDiscoveriesStepPublicDefinition.documentation?.examples ?? [];

    it.each(examples.map((example, index) => [index, example]))(
      'example %i contains YAML code block',
      (_index, example) => {
        expect(example).toContain('```yaml');
      }
    );

    it.each(examples.map((example, index) => [index, example]))(
      'example %i closes YAML code block',
      (_index, example) => {
        expect(example).toContain('```');
      }
    );

    it.each(examples.map((example, index) => [index, example]))(
      'example %i references the correct step type',
      (_index, example) => {
        expect(example).toContain('security.attack-discovery.persistDiscoveries');
      }
    );
  });
});
