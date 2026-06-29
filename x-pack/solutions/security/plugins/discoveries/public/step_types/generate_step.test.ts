/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { generateStepPublicDefinition } from './generate_step';
import { GenerateStepTypeId } from '../../common/step_types/generate_step';

describe('generateStepPublicDefinition', () => {
  describe('id', () => {
    it('returns the correct id', () => {
      expect(generateStepPublicDefinition.id).toBe(GenerateStepTypeId);
    });

    it('returns attack-discovery.generate', () => {
      expect(generateStepPublicDefinition.id).toBe('security.attack-discovery.generate');
    });
  });

  describe('label', () => {
    it('is defined', () => {
      expect(generateStepPublicDefinition.label).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof generateStepPublicDefinition.label).toBe('string');
    });

    it('is not empty', () => {
      expect(generateStepPublicDefinition.label.length).toBeGreaterThan(0);
    });
  });

  describe('description', () => {
    it('is defined', () => {
      expect(generateStepPublicDefinition.description).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof generateStepPublicDefinition.description).toBe('string');
    });

    it('is not empty', () => {
      expect(generateStepPublicDefinition.description?.length).toBeGreaterThan(0);
    });
  });

  describe('icon', () => {
    it('is defined', () => {
      expect(generateStepPublicDefinition.icon).toBeDefined();
    });
  });

  describe('category', () => {
    it('is set to AI', () => {
      expect(generateStepPublicDefinition.category).toBe(StepCategory.Ai);
    });
  });

  describe('schemas', () => {
    it('has inputSchema defined', () => {
      expect(generateStepPublicDefinition.inputSchema).toBeDefined();
    });

    it('has outputSchema defined', () => {
      expect(generateStepPublicDefinition.outputSchema).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('is defined', () => {
      expect(generateStepPublicDefinition.documentation).toBeDefined();
    });

    it('has details defined', () => {
      expect(generateStepPublicDefinition.documentation?.details).toBeDefined();
    });

    it('has details as a string', () => {
      expect(typeof generateStepPublicDefinition.documentation?.details).toBe('string');
    });

    it('has non-empty details', () => {
      expect(generateStepPublicDefinition.documentation?.details?.length).toBeGreaterThan(0);
    });

    it('has examples defined', () => {
      expect(generateStepPublicDefinition.documentation?.examples).toBeDefined();
    });

    it('has examples as an array', () => {
      expect(Array.isArray(generateStepPublicDefinition.documentation?.examples)).toBe(true);
    });

    it('has at least one example', () => {
      expect(generateStepPublicDefinition.documentation?.examples?.length).toBeGreaterThan(0);
    });

    it('has at least 3 examples', () => {
      expect(generateStepPublicDefinition.documentation?.examples?.length).toBeGreaterThanOrEqual(
        3
      );
    });
  });

  describe('documentation examples', () => {
    const examples = generateStepPublicDefinition.documentation?.examples ?? [];

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
        expect(example).toContain('security.attack-discovery.generate');
      }
    );
  });
});
