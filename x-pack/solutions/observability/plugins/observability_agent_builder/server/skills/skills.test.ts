/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { serviceInvestigationSkill } from './service_investigation';
import { logAnalysisSkill } from './log_analysis';
import { infrastructureAlertingSkill } from './infrastructure_alerting';

const allSkills = [serviceInvestigationSkill, logAnalysisSkill, infrastructureAlertingSkill];

describe('Observability Skills', () => {
  describe.each(allSkills)('$id', (skill) => {
    it('should pass schema validation', async () => {
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('should have a description under 1024 characters', () => {
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });

    it('should have non-empty content', () => {
      expect(skill.content.length).toBeGreaterThan(100);
    });

    it('should have a basePath starting with skills/observability/', () => {
      expect(skill.basePath).toMatch(/^skills\/observability\//);
    });

    it('should have registry tools defined', () => {
      const tools = skill.getRegistryTools?.();
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect((tools as string[]).length).toBeGreaterThan(0);
      expect((tools as string[]).length).toBeLessThanOrEqual(7);
    });
  });

  describe('service-investigation', () => {
    it('should include APM service tools', () => {
      const tools = serviceInvestigationSkill.getRegistryTools?.() as string[];
      expect(tools).toContain('observability.get_services');
      expect(tools).toContain('observability.get_trace_metrics');
      expect(tools).toContain('observability.get_traces');
      expect(tools).toContain('observability.get_runtime_metrics');
      expect(tools).toContain('observability.get_service_topology');
    });

    it('should have 7 tools (at the limit)', () => {
      const tools = serviceInvestigationSkill.getRegistryTools?.() as string[];
      expect(tools.length).toBe(7);
    });
  });

  describe('log-analysis', () => {
    it('should include log investigation tools', () => {
      const tools = logAnalysisSkill.getRegistryTools?.() as string[];
      expect(tools).toContain('observability.get_log_groups');
      expect(tools).toContain('observability.run_log_rate_analysis');
      expect(tools).toContain('observability.get_index_info');
      expect(tools).toContain('observability.get_log_change_points');
    });

    it('should have 7 tools', () => {
      const tools = logAnalysisSkill.getRegistryTools?.() as string[];
      expect(tools.length).toBe(7);
    });
  });

  describe('infrastructure-alerting', () => {
    it('should include infrastructure and alerting tools', () => {
      const tools = infrastructureAlertingSkill.getRegistryTools?.() as string[];
      expect(tools).toContain('observability.get_hosts');
      expect(tools).toContain('observability.get_alerts');
      expect(tools).toContain('observability.get_anomaly_detection_jobs');
      expect(tools).toContain('observability.get_metric_change_points');
      expect(tools).toContain('observability.get_trace_change_points');
    });

    it('should have 7 tools', () => {
      const tools = infrastructureAlertingSkill.getRegistryTools?.() as string[];
      expect(tools.length).toBe(7);
    });
  });

  describe('cross-skill uniqueness', () => {
    it('should have unique skill IDs', () => {
      const ids = allSkills.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique base paths', () => {
      const paths = allSkills.map((s) => `${s.basePath}/${s.name}`);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it('should have unique descriptions', () => {
      const descriptions = allSkills.map((s) => s.description);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    });

    it('should cover all 14 observability tools across skills', () => {
      const allToolIds = new Set<string>();
      for (const skill of allSkills) {
        const tools = skill.getRegistryTools?.() as string[];
        for (const tool of tools) {
          if (tool.startsWith('observability.')) {
            allToolIds.add(tool);
          }
        }
      }
      expect(allToolIds.size).toBe(14);
    });
  });
});
