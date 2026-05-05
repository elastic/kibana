/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

import { MITRE_ATTACK_TACTICS } from '../lib/prompt/local_prompt_object/attack_discovery_prompts';
import {
  ATTACK_DISCOVERY_GENERATOR_SKILL_BASE_PATH,
  ATTACK_DISCOVERY_GENERATOR_SKILL_ID,
  ATTACK_DISCOVERY_GENERATOR_SKILL_NAME,
  createAttackDiscoveryGeneratorSkill,
} from './attack_discovery_generator_skill';
import { GET_ATTACK_DISCOVERY_STATUS_TOOL_ID } from './tools/get_attack_discovery_status_tool';
import { GET_DEFAULT_ESQL_QUERY_TOOL_ID } from './tools/get_default_esql_query_tool';

const attackDiscoveryGeneratorSkill = createAttackDiscoveryGeneratorSkill({
  getEventLogIndex: async () => 'event-log-*',
  workflowExecutionLookup: { getWorkflowExecution: jest.fn() },
});

describe('attackDiscoveryGeneratorSkill', () => {
  it('passes validateSkillDefinition without error', async () => {
    await expect(validateSkillDefinition(attackDiscoveryGeneratorSkill)).resolves.toEqual(
      attackDiscoveryGeneratorSkill
    );
  });

  describe('id', () => {
    it('has the expected id', () => {
      expect(attackDiscoveryGeneratorSkill.id).toBe(ATTACK_DISCOVERY_GENERATOR_SKILL_ID);
    });

    it('uses the conventional attack-discovery prefix', () => {
      expect(attackDiscoveryGeneratorSkill.id).toMatch(/^attack-discovery-/);
    });
  });

  describe('name', () => {
    it('has the expected name', () => {
      expect(attackDiscoveryGeneratorSkill.name).toBe(ATTACK_DISCOVERY_GENERATOR_SKILL_NAME);
    });

    it('contains only lowercase letters, numbers, and hyphens', () => {
      expect(attackDiscoveryGeneratorSkill.name).toMatch(/^[a-z0-9-_]+$/);
    });

    it('is at most 64 characters', () => {
      expect(attackDiscoveryGeneratorSkill.name.length).toBeLessThanOrEqual(64);
    });
  });

  describe('basePath', () => {
    it('lives under skills/security/attack-discovery', () => {
      expect(attackDiscoveryGeneratorSkill.basePath).toBe(
        ATTACK_DISCOVERY_GENERATOR_SKILL_BASE_PATH
      );
    });
  });

  describe('description', () => {
    it('is non-empty', () => {
      expect(attackDiscoveryGeneratorSkill.description.length).toBeGreaterThan(0);
    });

    it('is at most 1024 characters', () => {
      expect(attackDiscoveryGeneratorSkill.description.length).toBeLessThanOrEqual(1024);
    });

    it('mentions attack chains', () => {
      expect(attackDiscoveryGeneratorSkill.description).toContain('attack chain');
    });

    it('mentions the attack-discovery.run workflow as the canonical pipeline', () => {
      expect(attackDiscoveryGeneratorSkill.description).toContain('attack-discovery.run');
    });
  });

  describe('content', () => {
    it('is non-empty', () => {
      expect(attackDiscoveryGeneratorSkill.content.length).toBeGreaterThan(0);
    });

    it('opens with the world-class cyber security analyst framing', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('world-class cyber security analyst');
    });

    it('includes the validation standard section', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('## Validation Standard');
    });

    it('emphasizes that the cost of a false positive is high', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('cost of a false positive');
    });

    it('instructs the agent to enumerate available tools', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('enumerate the tools available');
    });

    it('does not hard-code a specific threat-intel tool id', () => {
      expect(attackDiscoveryGeneratorSkill.content).not.toMatch(/platform\.threat_intel\./);
    });

    it('describes the Attack Chain definition (2+ alerts, multiple rules)', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('"Attack Chain"');
      expect(attackDiscoveryGeneratorSkill.content).toContain('alerts from more than one rule');
    });

    it('teaches default-to-split independent evaluation', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Default to splitting, not merging');
    });

    it('includes entity correlation hygiene guidance for service accounts', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Service accounts');
      expect(attackDiscoveryGeneratorSkill.content).toContain('NT AUTHORITY\\SYSTEM');
    });

    it('explains kibana.alert.original_time fallback behavior', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('kibana.alert.original_time');
      expect(attackDiscoveryGeneratorSkill.content).toContain('@timestamp');
    });

    it('weights HIGH/MEDIUM/LOW severity in alert prioritization', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('**HIGH** severity');
      expect(attackDiscoveryGeneratorSkill.content).toContain('**MEDIUM** severity');
      expect(attackDiscoveryGeneratorSkill.content).toContain('**LOW** severity');
    });

    it('directs the agent to invoke attack-discovery.run in sync mode', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('attack-discovery.run');
      expect(attackDiscoveryGeneratorSkill.content).toContain('sync');
    });

    it('documents all four retrieval modes', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('`provided`');
      expect(attackDiscoveryGeneratorSkill.content).toContain('`esql`');
      expect(attackDiscoveryGeneratorSkill.content).toContain('`custom_query`');
      expect(attackDiscoveryGeneratorSkill.content).toContain('`custom_only`');
    });

    it('documents the connector_id requirement', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('`connector_id`');
    });

    it('explains the anonymization boundary for the retrieval modes', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Anonymization Boundary');
    });

    it('instructs the agent to emit insights JSON inline', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('"insights"');
    });

    it('limits detailsMarkdown to 2750 characters', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('2750');
    });

    it('limits summaryMarkdown to 200 characters', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('200 characters');
    });

    it('embeds the field-syntax good example', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('{{ host.name hostNameValue }}');
    });

    it('embeds the field-syntax bad example', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('{{ hostNameValue }}');
    });

    it('lists every MITRE ATT&CK tactic from the canonical constant', () => {
      for (const tactic of MITRE_ATTACK_TACTICS) {
        expect(attackDiscoveryGeneratorSkill.content).toContain(tactic);
      }
    });

    it('does not fabricate discoveries when the pipeline returns none', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('do not fabricate');
    });

    it('instructs agents to render each discovery under a level-3 heading', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('### {title}');
    });

    it('instructs agents to include a host context label per discovery', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('**Host:**');
    });

    it('instructs agents to include a user context label per discovery', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('**User:**');
    });

    it('instructs agents to paraphrase prose without raw double-brace tokens in markdown', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain(
        'do **not** copy raw `{{ field uuid }}` tokens'
      );
    });

    it('instructs agents to include an Attack Chain tactics line per discovery', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('**Attack Chain**');
    });

    it('instructs agents to embed an Open in Attack Discovery deep link', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('[Open in Attack Discovery]');
    });

    it('still requires the insights JSON to retain the double-brace field syntax', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain(
        'JSON **must** retain the `{{ field uuid }}` syntax'
      );
    });

    it('mandates full presentation of every discovery with no abbreviation', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Full presentation is mandatory');
    });

    it('forbids abbreviated title-only or entity-badge-only outputs', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain(
        'never abbreviate to title + entity badges only'
      );
    });

    it('requires the same rich shape on status-resume (Mode B succeeded)', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain(
        'present them in the same rich shape'
      );
    });

    it('introduces an Upfront Pipeline Pattern section', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Upfront Pipeline Pattern');
    });

    it('instructs the agent to retrieve alerts upstream before invoking attack-discovery.run', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Retrieve alerts upstream');
    });

    it('frames the default ES|QL query as a baseline that the agent may adapt', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('sensible **baseline**');
    });

    it('encourages best-effort corroboration with at least one additional tool', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain(
        'Corroborate with at least one additional tool when available (best-effort)'
      );
    });

    it('recommends additional_context as the preferred upfront shape', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('`additional_context`');
    });

    it('introduces an explicit Time budget guidance for upfront work', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('Time budget');
    });

    it('aligns the upfront time budget with the AD soft deadline (~90 seconds)', () => {
      expect(attackDiscoveryGeneratorSkill.content).toContain('~90 seconds');
    });
  });

  describe('referencedContent', () => {
    it('exposes three references', () => {
      expect(attackDiscoveryGeneratorSkill.referencedContent).toHaveLength(3);
    });

    it('includes the run-modes reference', () => {
      const names = attackDiscoveryGeneratorSkill.referencedContent?.map((entry) => entry.name);

      expect(names).toContain('attack-discovery-run-modes');
    });

    it('includes the default prompt reference', () => {
      const names = attackDiscoveryGeneratorSkill.referencedContent?.map((entry) => entry.name);

      expect(names).toContain('default-prompt-reference');
    });

    it('includes the refine prompt reference', () => {
      const names = attackDiscoveryGeneratorSkill.referencedContent?.map((entry) => entry.name);

      expect(names).toContain('refine-prompt-reference');
    });

    it('places every reference in the skill base directory', () => {
      for (const entry of attackDiscoveryGeneratorSkill.referencedContent ?? []) {
        expect(entry.relativePath).toBe('.');
      }
    });

    it('keeps every reference content non-empty', () => {
      for (const entry of attackDiscoveryGeneratorSkill.referencedContent ?? []) {
        expect(entry.content.length).toBeGreaterThan(0);
      }
    });

    it('shows a provided-mode example in the run-modes reference', () => {
      const runModes = attackDiscoveryGeneratorSkill.referencedContent?.find(
        (entry) => entry.name === 'attack-discovery-run-modes'
      );

      expect(runModes?.content).toContain('`provided` mode');
    });

    it('preserves the canonical default analyst prompt verbatim in the reference', () => {
      const defaultRef = attackDiscoveryGeneratorSkill.referencedContent?.find(
        (entry) => entry.name === 'default-prompt-reference'
      );

      expect(defaultRef?.content).toContain(
        'As a world-class cyber security analyst, your task is to analyze a set of security events'
      );
    });

    it('preserves the canonical refine prompt verbatim in the reference', () => {
      const refineRef = attackDiscoveryGeneratorSkill.referencedContent?.find(
        (entry) => entry.name === 'refine-prompt-reference'
      );

      expect(refineRef?.content).toContain('Review the JSON output from your initial analysis');
    });
  });

  describe('getRegistryTools', () => {
    it('exposes execute_esql for threat hunting corroboration', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.executeEsql);
    });

    it('exposes generate_esql for query authoring corroboration', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.generateEsql);
    });

    it('exposes search for general document lookup', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.search);
    });

    it('exposes get_document_by_id for alert detail retrieval', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.getDocumentById);
    });

    it('exposes get_index_mapping for schema introspection', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.getIndexMapping);
    });

    it('exposes get_workflow_execution_status for tracking async runs', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools).toContain(platformCoreTools.getWorkflowExecutionStatus);
    });

    it('does not exceed the maximum of 7 tools', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getRegistryTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });

  describe('getInlineTools', () => {
    it('returns two inline tools', async () => {
      const tools = await attackDiscoveryGeneratorSkill.getInlineTools?.();

      expect(tools).toHaveLength(2);
    });

    it('exposes the get_default_esql_query inline tool', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getInlineTools?.()) ?? [];

      expect(tools.map((tool) => tool.id)).toContain(GET_DEFAULT_ESQL_QUERY_TOOL_ID);
    });

    it('exposes the get_attack_discovery_status inline tool', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getInlineTools?.()) ?? [];

      expect(tools.map((tool) => tool.id)).toContain(GET_ATTACK_DISCOVERY_STATUS_TOOL_ID);
    });

    it('returns builtin tool types', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getInlineTools?.()) ?? [];

      expect(tools.every((tool) => tool.type === ToolType.builtin)).toBe(true);
    });

    it('does not exceed the maximum of 7 inline tools', async () => {
      const tools = (await attackDiscoveryGeneratorSkill.getInlineTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });
});
