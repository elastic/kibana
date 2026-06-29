/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

import { alertRetrievalBuilderSkill } from './alert_retrieval_builder_skill';
import { GET_DEFAULT_ESQL_QUERY_TOOL_ID } from './tools/get_default_esql_query_tool';

describe('alertRetrievalBuilderSkill', () => {
  it('passes validateSkillDefinition without error', async () => {
    await expect(validateSkillDefinition(alertRetrievalBuilderSkill)).resolves.toEqual(
      alertRetrievalBuilderSkill
    );
  });

  describe('id', () => {
    it('has the expected id', () => {
      expect(alertRetrievalBuilderSkill.id).toBe('attack-discovery-alert-retrieval-builder');
    });
  });

  describe('name', () => {
    it('has the expected name', () => {
      expect(alertRetrievalBuilderSkill.name).toBe('attack-discovery-alerts-esql-query-builder');
    });

    it('contains only lowercase letters, numbers, and hyphens', () => {
      expect(alertRetrievalBuilderSkill.name).toMatch(/^[a-z0-9-_]+$/);
    });

    it('is at most 64 characters', () => {
      expect(alertRetrievalBuilderSkill.name.length).toBeLessThanOrEqual(64);
    });
  });

  describe('basePath', () => {
    it('has the expected basePath', () => {
      expect(alertRetrievalBuilderSkill.basePath).toBe('skills/security/attack-discovery');
    });
  });

  describe('description', () => {
    it('is non-empty', () => {
      expect(alertRetrievalBuilderSkill.description.length).toBeGreaterThan(0);
    });

    it('is at most 1024 characters', () => {
      expect(alertRetrievalBuilderSkill.description.length).toBeLessThanOrEqual(1024);
    });

    it('mentions ES|QL query building', () => {
      expect(alertRetrievalBuilderSkill.description).toContain('ES|QL');
    });
  });

  describe('content', () => {
    it('is non-empty', () => {
      expect(alertRetrievalBuilderSkill.content.length).toBeGreaterThan(0);
    });

    it('does not contain workflow YAML instructions', () => {
      expect(alertRetrievalBuilderSkill.content).not.toContain('Workflow YAML Structure');
      expect(alertRetrievalBuilderSkill.content).not.toContain('Generate Elastic Workflows YAML');
    });

    it('instructs the agent to call get_default_esql_query tool first when building from scratch', () => {
      expect(alertRetrievalBuilderSkill.content).toContain(
        'security.attack-discovery.get_default_esql_query'
      );
    });

    it('includes the from-scratch flow using generate_esql', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('platform.core.generate_esql');
    });

    it('includes the modify-existing flow with additionalContext', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('additionalContext');
    });

    it('instructs the agent to preserve KEEP fields when modifying an existing query', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('Preserve the existing KEEP fields');
    });

    it('includes instructions to call update_esql_query browser API tool', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('update_esql_query');
    });

    it('includes guidance for open/acknowledged alert filtering', () => {
      expect(alertRetrievalBuilderSkill.content).toContain(
        'kibana.alert.workflow_status IN ("open", "acknowledged")'
      );
    });

    it('includes guidance for building block exclusion', () => {
      expect(alertRetrievalBuilderSkill.content).toContain(
        'kibana.alert.building_block_type IS NULL'
      );
    });

    it('includes guidance for risk score sorting', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('kibana.alert.risk_score DESC');
    });

    it('includes guidance for LIMIT', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('| LIMIT');
    });

    it('includes guidance for the KEEP clause with security fields', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('| KEEP');
      expect(alertRetrievalBuilderSkill.content).toContain('kibana.alert.rule.name');
      expect(alertRetrievalBuilderSkill.content).toContain('host.name');
      expect(alertRetrievalBuilderSkill.content).toContain('process.name');
      expect(alertRetrievalBuilderSkill.content).toContain('user.name');
    });

    it('includes guidance for the alert index pattern', () => {
      expect(alertRetrievalBuilderSkill.content).toContain('.alerts-security.alerts-');
    });
  });

  describe('referencedContent', () => {
    it('includes example ES|QL queries', () => {
      expect(alertRetrievalBuilderSkill.referencedContent).toHaveLength(1);
    });

    it('has the expected reference name', () => {
      expect(alertRetrievalBuilderSkill.referencedContent?.[0].name).toBe('example-esql-queries');
    });

    it('has the expected relative path', () => {
      expect(alertRetrievalBuilderSkill.referencedContent?.[0].relativePath).toBe('./examples');
    });

    it('includes non-empty example content', () => {
      const { content } = alertRetrievalBuilderSkill.referencedContent?.[0] ?? {};

      expect(content?.length).toBeGreaterThan(0);
    });

    it('references ES|QL queries (not workflow YAML)', () => {
      const { content } = alertRetrievalBuilderSkill.referencedContent?.[0] ?? {};

      expect(content).toContain('FROM .alerts-security.alerts-default METADATA _id');
      expect(content).not.toContain("version: '1'");
      expect(content).not.toContain('type: elasticsearch.esql.query');
    });

    it('includes a default query example', () => {
      const { content } = alertRetrievalBuilderSkill.referencedContent?.[0] ?? {};

      expect(content).toContain('## Default query');
    });

    it('includes a filtered-by-rule-name example', () => {
      const { content } = alertRetrievalBuilderSkill.referencedContent?.[0] ?? {};

      expect(content).toContain('## Filtered by rule name');
    });

    it('includes a high-severity-only example', () => {
      const { content } = alertRetrievalBuilderSkill.referencedContent?.[0] ?? {};

      expect(content).toContain('## High severity only');
    });
  });

  describe('getRegistryTools', () => {
    it('returns generate_esql and execute_esql tools', async () => {
      const tools = await alertRetrievalBuilderSkill.getRegistryTools?.();

      expect(tools).toEqual([platformCoreTools.generateEsql, platformCoreTools.executeEsql]);
    });

    it('does not exceed the maximum of 7 tools', async () => {
      const tools = (await alertRetrievalBuilderSkill.getRegistryTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });

  describe('getInlineTools', () => {
    it('returns one inline tool', async () => {
      const tools = await alertRetrievalBuilderSkill.getInlineTools?.();

      expect(tools).toHaveLength(1);
    });

    it('returns the get_default_esql_query tool', async () => {
      const tools = await alertRetrievalBuilderSkill.getInlineTools?.();

      expect(tools?.[0].id).toBe(GET_DEFAULT_ESQL_QUERY_TOOL_ID);
    });

    it('returns a builtin tool type', async () => {
      const tools = await alertRetrievalBuilderSkill.getInlineTools?.();

      expect(tools?.[0].type).toBe(ToolType.builtin);
    });

    it('does not exceed the maximum of 7 inline tools', async () => {
      const tools = (await alertRetrievalBuilderSkill.getInlineTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });
});
