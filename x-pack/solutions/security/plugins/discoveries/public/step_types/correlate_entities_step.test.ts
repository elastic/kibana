/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { correlateEntitiesStepPublicDefinition } from './correlate_entities_step';
import { CorrelateEntitiesStepTypeId } from '../../common/step_types/correlate_entities_step';

describe('correlateEntitiesStepPublicDefinition', () => {
  describe('id', () => {
    it('returns the correct id', () => {
      expect(correlateEntitiesStepPublicDefinition.id).toBe(CorrelateEntitiesStepTypeId);
    });

    it('returns security.attack-discovery.correlateEntities', () => {
      expect(correlateEntitiesStepPublicDefinition.id).toBe(
        'security.attack-discovery.correlateEntities'
      );
    });
  });

  describe('label', () => {
    it('is a non-empty string', () => {
      expect(typeof correlateEntitiesStepPublicDefinition.label).toBe('string');
      expect(correlateEntitiesStepPublicDefinition.label.length).toBeGreaterThan(0);
    });
  });

  describe('description', () => {
    it('is a non-empty string', () => {
      expect(typeof correlateEntitiesStepPublicDefinition.description).toBe('string');
      expect(correlateEntitiesStepPublicDefinition.description?.length).toBeGreaterThan(0);
    });
  });

  describe('icon', () => {
    it('is defined', () => {
      expect(correlateEntitiesStepPublicDefinition.icon).toBeDefined();
    });
  });

  describe('category', () => {
    it('is set to Kibana', () => {
      expect(correlateEntitiesStepPublicDefinition.category).toBe(StepCategory.Kibana);
    });
  });

  describe('schemas', () => {
    it('has inputSchema defined', () => {
      expect(correlateEntitiesStepPublicDefinition.inputSchema).toBeDefined();
    });

    it('has outputSchema defined', () => {
      expect(correlateEntitiesStepPublicDefinition.outputSchema).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('has non-empty details', () => {
      expect(correlateEntitiesStepPublicDefinition.documentation?.details?.length).toBeGreaterThan(
        0
      );
    });

    it('has at least 3 examples', () => {
      expect(
        correlateEntitiesStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('documentation examples', () => {
    const examples = correlateEntitiesStepPublicDefinition.documentation?.examples ?? [];

    it.each(examples.map((example, index) => [index, example]))(
      'example %i contains YAML code block',
      (_index, example) => {
        expect(example).toContain('```yaml');
      }
    );

    it.each(examples.map((example, index) => [index, example]))(
      'example %i references the correct step type',
      (_index, example) => {
        expect(example).toContain('security.attack-discovery.correlateEntities');
      }
    );
  });
});
