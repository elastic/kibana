/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSyntheticEscalation, WATCH_WORKFLOW_IDS } from './constants';

describe('watch-escalation-chain suite constants (L0, no LLM)', () => {
  describe('buildSyntheticEscalation', () => {
    const escalation = buildSyntheticEscalation('inv-test-123');

    it('is an object (not a primitive) -- the exact shape bug #9 corrupted', () => {
      expect(typeof escalation).toBe('object');
      expect(escalation).not.toBeNull();
    });

    it('carries the investigationId passed in, unchanged', () => {
      expect(escalation.investigationId).toBe('inv-test-123');
    });

    it('matches the fields the real Floor->Dark handoff produces', () => {
      // Same shape as watch_floor_orchestrator.yaml's escalate_to_dark step
      // (fromWatch/toWatch/reason/confidence/investigationId/indicators).
      expect(escalation).toHaveProperty('fromWatch');
      expect(escalation).toHaveProperty('toWatch');
      expect(escalation).toHaveProperty('reason');
      expect(escalation).toHaveProperty('confidence');
      expect(escalation).toHaveProperty('investigationId');
      expect(escalation).toHaveProperty('indicators');
    });

    it('confidence is a plausible float in [0, 1]', () => {
      expect(escalation.confidence).toBeGreaterThan(0);
      expect(escalation.confidence).toBeLessThanOrEqual(1);
    });

    it('indicators reference at least one real MITRE technique id, to actually exercise the coverage-gap route', () => {
      expect(Array.isArray(escalation.indicators)).toBe(true);
      expect(escalation.indicators.length).toBeGreaterThan(0);
      for (const indicator of escalation.indicators) {
        expect(indicator).toMatch(/^T\d{4}(\.\d{3})?$/);
      }
    });

    it('is JSON-serializable without loss (guards against the [object Object] regression at the fixture level)', () => {
      const serialized = JSON.stringify(escalation);
      const roundTripped = JSON.parse(serialized);
      expect(roundTripped).toEqual(escalation);
      expect(serialized).not.toContain('[object Object]');
    });
  });

  describe('WATCH_WORKFLOW_IDS', () => {
    it('every id is a non-empty string with the system-security-watch- prefix', () => {
      for (const id of Object.values(WATCH_WORKFLOW_IDS)) {
        expect(typeof id).toBe('string');
        expect(id.startsWith('system-security-watch-')).toBe(true);
      }
    });

    it('ids are unique', () => {
      const ids = Object.values(WATCH_WORKFLOW_IDS);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
