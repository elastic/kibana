/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  machineLearningStrategy,
  buildMachineLearningNarrative,
} from './machine_learning_strategy';

describe('machineLearningStrategy', () => {
  describe('match', () => {
    it('returns true when rule type is machine_learning', () => {
      expect(
        machineLearningStrategy.match({
          kibana: { alert: { rule: { type: ['machine_learning'] } } },
        })
      ).toBe(true);
    });

    it('returns false for other rule types', () => {
      expect(
        machineLearningStrategy.match({ kibana: { alert: { rule: { type: ['query'] } } } })
      ).toBe(false);
    });
  });

  describe('buildMachineLearningNarrative', () => {
    it('builds an ML narrative with action and context', () => {
      const text = buildMachineLearningNarrative({
        event: { action: ['rare_process_by_host'] },
        user: { name: ['alice'] },
        host: { name: ['workstation-42'] },
        source: { ip: ['10.0.0.5'] },
        kibana: {
          alert: {
            severity: ['medium'],
            rule: {
              name: ['Anomalous Process For a Windows Population'],
              type: ['machine_learning'],
            },
          },
        },
      });

      expect(text).toBe(
        'Machine learning anomaly detected: rare_process_by_host by alice on workstation-42 source 10.0.0.5 created medium alert Anomalous Process For a Windows Population.'
      );
    });

    it('handles minimal ML data', () => {
      expect(
        buildMachineLearningNarrative({
          kibana: { alert: { rule: { type: ['machine_learning'] } } },
        })
      ).toBe('Machine learning anomaly detected');
    });
  });
});
