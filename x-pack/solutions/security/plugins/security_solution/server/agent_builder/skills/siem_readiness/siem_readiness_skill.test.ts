/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { siemReadinessSkill } from './siem_readiness_skill';
import {
  SIEM_READINESS_COVERAGE_TOOL_ID,
  SIEM_READINESS_QUALITY_TOOL_ID,
  SIEM_READINESS_CONTINUITY_TOOL_ID,
  SIEM_READINESS_RETENTION_TOOL_ID,
} from '../../tools/siem_readiness';

describe('siemReadinessSkill', () => {
  describe('skill definition', () => {
    it('has correct id and name', () => {
      expect(siemReadinessSkill.id).toBe('siem-readiness');
      expect(siemReadinessSkill.name).toBe('siem-readiness');
    });

    it('returns the expected registry tool IDs', () => {
      expect(siemReadinessSkill.getRegistryTools?.()).toEqual([
        SIEM_READINESS_COVERAGE_TOOL_ID,
        SIEM_READINESS_QUALITY_TOOL_ID,
        SIEM_READINESS_CONTINUITY_TOOL_ID,
        SIEM_READINESS_RETENTION_TOOL_ID,
      ]);
    });
  });

  describe('tool discipline guards', () => {
    it('treats readiness tool output as the authoritative short-circuit', () => {
      expect(siemReadinessSkill.content).toContain('pre-computed, authoritative');
      expect(siemReadinessSkill.content).toContain('source of truth');
    });

    it('forbids speculative platform.core corroboration calls', () => {
      expect(siemReadinessSkill.content).toContain('platform.core.search');
      expect(siemReadinessSkill.content).toContain('platform.core.get_document_by_id');
      expect(siemReadinessSkill.content).toContain('platform.core.generate_esql');
    });

    it('bounds corroboration to one pass per dimension', () => {
      expect(siemReadinessSkill.content).toContain('One pass per dimension, bounded');
      expect(siemReadinessSkill.content).toContain('at most once per question');
    });

    it('forbids post-assessment calls and treats noData as a terminal answer', () => {
      expect(siemReadinessSkill.content).toContain('No post-assessment calls');
      expect(siemReadinessSkill.content).toContain('noData');
      expect(siemReadinessSkill.content).toContain('terminal answer');
    });
  });
});
