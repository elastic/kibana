/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { defaultAlertRetrievalStepPublicDefinition } from './default_alert_retrieval_step';
import { DefaultAlertRetrievalStepTypeId } from '../../common/step_types/default_alert_retrieval_step';

describe('defaultAlertRetrievalStepPublicDefinition', () => {
  describe('id', () => {
    it('returns the correct id', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.id).toBe(DefaultAlertRetrievalStepTypeId);
    });

    it('returns attack-discovery.defaultAlertRetrieval', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.id).toBe(
        'security.attack-discovery.defaultAlertRetrieval'
      );
    });
  });

  describe('label', () => {
    it('is defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.label).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof defaultAlertRetrievalStepPublicDefinition.label).toBe('string');
    });

    it('is not empty', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.label.length).toBeGreaterThan(0);
    });
  });

  describe('description', () => {
    it('is defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.description).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof defaultAlertRetrievalStepPublicDefinition.description).toBe('string');
    });

    it('is not empty', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.description?.length).toBeGreaterThan(0);
    });
  });

  describe('icon', () => {
    it('is defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.icon).toBeDefined();
    });
  });

  describe('category', () => {
    it('is set to Elasticsearch', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.category).toBe(StepCategory.Elasticsearch);
    });
  });

  describe('schemas', () => {
    it('has inputSchema defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.inputSchema).toBeDefined();
    });

    it('has outputSchema defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.outputSchema).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('is defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.documentation).toBeDefined();
    });

    it('has details defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.documentation?.details).toBeDefined();
    });

    it('has details as a string', () => {
      expect(typeof defaultAlertRetrievalStepPublicDefinition.documentation?.details).toBe(
        'string'
      );
    });

    it('has non-empty details', () => {
      expect(
        defaultAlertRetrievalStepPublicDefinition.documentation?.details?.length
      ).toBeGreaterThan(0);
    });

    it('has examples defined', () => {
      expect(defaultAlertRetrievalStepPublicDefinition.documentation?.examples).toBeDefined();
    });

    it('has examples as an array', () => {
      expect(Array.isArray(defaultAlertRetrievalStepPublicDefinition.documentation?.examples)).toBe(
        true
      );
    });

    it('has at least one example', () => {
      expect(
        defaultAlertRetrievalStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThan(0);
    });

    it('has at least 3 examples', () => {
      expect(
        defaultAlertRetrievalStepPublicDefinition.documentation?.examples?.length
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('documentation examples', () => {
    const examples = defaultAlertRetrievalStepPublicDefinition.documentation?.examples ?? [];

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
        expect(example).toContain('security.attack-discovery.defaultAlertRetrieval');
      }
    );
  });
});
