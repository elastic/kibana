/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { defaultValidationStepPublicDefinition } from './default_validation_step';
import { DefaultValidationStepTypeId } from '../../common/step_types/default_validation_step';

describe('defaultValidationStepPublicDefinition', () => {
  describe('id', () => {
    it('returns the correct id', () => {
      expect(defaultValidationStepPublicDefinition.id).toBe(DefaultValidationStepTypeId);
    });

    it('returns attack-discovery.defaultValidation', () => {
      expect(defaultValidationStepPublicDefinition.id).toBe(
        'security.attack-discovery.defaultValidation'
      );
    });
  });

  describe('label', () => {
    it('is defined', () => {
      expect(defaultValidationStepPublicDefinition.label).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof defaultValidationStepPublicDefinition.label).toBe('string');
    });

    it('is not empty', () => {
      expect(defaultValidationStepPublicDefinition.label.length).toBeGreaterThan(0);
    });
  });

  describe('description', () => {
    it('is defined', () => {
      expect(defaultValidationStepPublicDefinition.description).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof defaultValidationStepPublicDefinition.description).toBe('string');
    });

    it('is not empty', () => {
      expect(defaultValidationStepPublicDefinition.description?.length).toBeGreaterThan(0);
    });
  });

  describe('icon', () => {
    it('is defined', () => {
      expect(defaultValidationStepPublicDefinition.icon).toBeDefined();
    });
  });

  describe('category', () => {
    it('is set to Kibana', () => {
      expect(defaultValidationStepPublicDefinition.category).toBe(StepCategory.Kibana);
    });
  });

  describe('schemas', () => {
    it('has inputSchema defined', () => {
      expect(defaultValidationStepPublicDefinition.inputSchema).toBeDefined();
    });

    it('has outputSchema defined', () => {
      expect(defaultValidationStepPublicDefinition.outputSchema).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('is defined', () => {
      expect(defaultValidationStepPublicDefinition.documentation).toBeDefined();
    });

    it('has details defined', () => {
      expect(defaultValidationStepPublicDefinition.documentation?.details).toBeDefined();
    });

    it('has details as a string', () => {
      expect(typeof defaultValidationStepPublicDefinition.documentation?.details).toBe('string');
    });

    it('has non-empty details', () => {
      expect(defaultValidationStepPublicDefinition.documentation?.details?.length).toBeGreaterThan(
        0
      );
    });

    it('has examples defined', () => {
      expect(defaultValidationStepPublicDefinition.documentation?.examples).toBeDefined();
    });

    it('has examples as an array', () => {
      expect(Array.isArray(defaultValidationStepPublicDefinition.documentation?.examples)).toBe(
        true
      );
    });

    it('has at least one example', () => {
      expect(defaultValidationStepPublicDefinition.documentation?.examples?.length).toBeGreaterThan(
        0
      );
    });

    it('has at least 3 examples', () => {
      expect(
        defaultValidationStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('documentation examples', () => {
    const examples = defaultValidationStepPublicDefinition.documentation?.examples ?? [];

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
        expect(example).toContain('security.attack-discovery.defaultValidation');
      }
    );
  });
});
