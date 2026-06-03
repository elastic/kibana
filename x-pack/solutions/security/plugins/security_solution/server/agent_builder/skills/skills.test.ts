/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { threatHuntingSkill } from './threat_hunting';
import { alertAnalysisSkill } from './alert_analysis';
import { getDetectionEmulationSkill } from './detection_emulation';
import type { DetectionEmulationSkillContext } from './detection_emulation';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import type { ConfigType } from '../../config';
import { createDetectionEmulationGuardrails } from '../../lib/detection_emulation/execution/shared_guardrails';

const createDetectionEmulationCtx = (): DetectionEmulationSkillContext => {
  const logger = loggingSystemMock.createLogger();
  const config = {
    experimentalFeatures: { detectionEmulationRealExecution: false },
  } as unknown as ConfigType;
  return {
    core: {
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ plugins: { cases: undefined }, security: undefined }, {}]),
    } as unknown as SecuritySolutionPluginCoreSetupDependencies,
    endpointService: {} as unknown as EndpointAppContextService,
    config,
    logger,
    // Real shared guardrail bundle so the skill's six inline tool factories
    // each get the SAME allowlist + rate-limiter + concurrency-gate, mirroring
    // the production wiring in `plugin.ts`. The shape tests below never
    // dispatch, so the guardrails' default-deny behaviour is irrelevant here.
    guardrails: createDetectionEmulationGuardrails(config, logger),
  };
};

const ALL_SKILLS = [
  threatHuntingSkill,
  alertAnalysisSkill,
  getDetectionEmulationSkill(createDetectionEmulationCtx()),
];

describe('Security Skills', () => {
  describe('threat-hunting skill', () => {
    it('validates successfully via validateSkillDefinition', async () => {
      await expect(validateSkillDefinition(threatHuntingSkill)).resolves.toBeDefined();
    });

    it('has non-empty content', () => {
      expect(threatHuntingSkill.content.length).toBeGreaterThan(100);
    });

    it('has description under 1024 characters', () => {
      expect(threatHuntingSkill.description.length).toBeLessThanOrEqual(1024);
    });

    it('returns 6 registry tools (under 7 limit)', () => {
      const tools = threatHuntingSkill.getRegistryTools!();
      expect(tools).toHaveLength(6);
    });

    it('includes platformCoreTools.cases for escalation', () => {
      const tools = threatHuntingSkill.getRegistryTools!();
      expect(tools).toContain(platformCoreTools.cases);
    });

    it('content mentions case creation for confirmed findings', () => {
      expect(threatHuntingSkill.content).toContain('platform.core.cases');
    });

    it('content references alert-analysis skill', () => {
      expect(threatHuntingSkill.content).toContain('alert-analysis');
    });

    it('has no inline tools', () => {
      expect(threatHuntingSkill.getInlineTools).toBeUndefined();
    });

    it('has referenced content for query templates', () => {
      expect(threatHuntingSkill.referencedContent).toBeDefined();
      expect(threatHuntingSkill.referencedContent!.length).toBe(4);
      const names = threatHuntingSkill.referencedContent!.map((rc) => rc.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'lateral-movement',
          'c2-beaconing',
          'brute-force',
          'rare-process-execution',
        ])
      );
    });
  });

  describe('alert-analysis skill', () => {
    it('validates successfully via validateSkillDefinition', async () => {
      await expect(validateSkillDefinition(alertAnalysisSkill)).resolves.toBeDefined();
    });

    it('has non-empty content', () => {
      expect(alertAnalysisSkill.content.length).toBeGreaterThan(100);
    });

    it('has description under 1024 characters', () => {
      expect(alertAnalysisSkill.description.length).toBeLessThanOrEqual(1024);
    });

    it('returns 3 registry tools', () => {
      const tools = alertAnalysisSkill.getRegistryTools!();
      expect(tools).toHaveLength(3);
    });

    it('returns 1 inline tool (get-related-alerts)', async () => {
      const inlineTools = await alertAnalysisSkill.getInlineTools!();
      expect(inlineTools).toHaveLength(1);
      expect(inlineTools[0].id).toBe('security.alert-analysis.get-related-alerts');
    });

    it('has total tool count under 7 limit (3 registry + 1 inline = 4)', async () => {
      const registryTools = await alertAnalysisSkill.getRegistryTools!();
      const inlineTools = await alertAnalysisSkill.getInlineTools!();
      expect(registryTools.length + inlineTools.length).toBeLessThanOrEqual(7);
    });

    it('content references entity-analytics skill for deeper profiling', () => {
      expect(alertAnalysisSkill.content).toContain('entity-analytics');
    });
  });

  describe('detection-emulation skill', () => {
    it('validates successfully via validateSkillDefinition', async () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('has non-empty content', () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      expect(skill.content.length).toBeGreaterThan(100);
    });

    it('has description under 1024 characters', () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });

    it('has six inline tools (4 per-family run* + validate-rule + get-history)', async () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      // getInlineTools may return a Promise<Tool[]> or a Tool[]; await covers both.
      const tools = await skill.getInlineTools!();
      // The single legacy `run-command` tool was split into four per-family
      // tools (process / file / network / execution) so each one can advertise
      // a tightly-scoped command enum + parameters discriminated union to the
      // LLM. See `run_*_command_tool.ts` for the boundary schemas.
      expect(tools).toHaveLength(6);
      const ids = (tools as Array<{ id: string }>).map((t) => t.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'security.detection-emulation.validate-rule',
          'security.detection-emulation.get-history',
          'security.detection-emulation.run-process-command',
          'security.detection-emulation.run-file-command',
          'security.detection-emulation.run-network-command',
          'security.detection-emulation.run-execution-command',
        ])
      );
    });

    it('total tool count stays under the 7-skill cap', async () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      const inlineTools = await skill.getInlineTools!();
      const registryTools = (await skill.getRegistryTools?.()) ?? [];
      expect(inlineTools.length + registryTools.length).toBeLessThanOrEqual(7);
    });

    it('content describes the only currently-wired agent type (endpoint)', () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      // After the eval-driven trim, the skill body no longer enumerates the
      // unsupported EDR vendor IDs verbatim; that scope-narrowing is now
      // enforced at the tool-schema level (see `validate_rule_input.ts`'s
      // `z.literal('endpoint')`). The skill body just needs to keep the
      // catalog discoverable for `endpoint`.
      expect(skill.content.toLowerCase()).toContain('endpoint');
      expect(skill.description.toLowerCase()).toContain('endpoint');
    });

    // Regression guard against the historical "tool ids with dots break on
    // Bedrock" failure mode. `sanitizeToolId` rewrites dots to underscores
    // and strips anything outside `[a-zA-Z0-9_-]` so the names that reach
    // the Bedrock / Anthropic / OpenAI tool-call surface are always
    // schema-legal. We exercise it on every detection-emulation tool id we
    // ship so a future rename that introduces a forbidden character (or a
    // post-sanitization collision with a sibling tool) trips this test
    // before it leaks into a connector trace.
    //
    // Why this lives here rather than in
    // `agent-builder-genai-utils/.../tools.test.ts`: the upstream test
    // covers the function itself; this test covers the *contract* between
    // this skill's tool ids and that function. If a tool id changes here,
    // the failure should localize to this skill, not to the framework.
    it('all inline tool ids round-trip through sanitizeToolId without collision or empty results', async () => {
      const skill = getDetectionEmulationSkill(createDetectionEmulationCtx());
      const tools = (await skill.getInlineTools!()) as Array<{ id: string }>;

      const sanitized = tools.map((t) => sanitizeToolId(t.id));

      for (const [original, normalized] of tools.map((t, i) => [t.id, sanitized[i]] as const)) {
        // Sanitization must produce a non-empty, Bedrock-/Anthropic-legal
        // identifier. An empty string would mean every character of the id
        // was forbidden, which would silently get auto-renamed to a
        // collision suffix downstream — exactly the failure mode the
        // earlier Sonnet 4.5 / Bedrock incident produced.
        expect(normalized).toMatch(/^[a-zA-Z0-9_-]+$/);
        expect(normalized.length).toBeGreaterThan(0);
        // The current convention uses dots as namespace separators
        // (`security.detection-emulation.<verb>`); the sanitizer should
        // collapse them to underscores rather than drop them entirely.
        expect(normalized).not.toContain('.');
        // Sanity: an unsanitized id with dots should NEVER equal the
        // sanitized form — that would mean we forgot to namespace it.
        if (original.includes('.')) {
          expect(normalized).not.toEqual(original);
        }
      }

      // Post-sanitization uniqueness: `createToolIdMappings` will append
      // `_1`, `_2`, … to break collisions, but those suffixes leak into
      // the LLM's tool-call surface and confuse selection. Catch
      // collisions here at design time.
      expect(new Set(sanitized).size).toBe(sanitized.length);
    });
  });

  describe('cross-skill validation', () => {
    it('has no duplicate skill IDs', () => {
      const ids = ALL_SKILLS.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('has no duplicate skill paths', () => {
      const paths = ALL_SKILLS.map((s) => `${s.basePath}/${s.name}`);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it('has distinct descriptions', () => {
      const descriptions = ALL_SKILLS.map((s) => s.description);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    });

    it('all referenced content has valid relative paths', () => {
      for (const skill of ALL_SKILLS) {
        for (const ref of skill.referencedContent ?? []) {
          expect(ref.relativePath).toMatch(/^(?:\.|\.\/[a-z0-9-_]+)$/);
          expect(ref.name).toMatch(/^[a-z0-9-_]+$/);
          expect(ref.content.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
