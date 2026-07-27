/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import {
  createEndpointResponseActionsSkill,
  ISOLATE_TOOL_ID,
  UNISOLATE_TOOL_ID,
  GET_ENDPOINT_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
  RUNNING_PROCESSES_TOOL_ID,
  SCAN_TOOL_ID,
  GET_RESPONSE_ACTION_STATUS_TOOL_ID,
} from '.';

describe('createEndpointResponseActionsSkill', () => {
  describe('skill definition', () => {
    it('returns a valid skill definition', () => {
      const skill = createEndpointResponseActionsSkill();

      expect(skill).toBeDefined();
      expect(skill.id).toBe('endpoint-response-actions');
      expect(skill.name).toBe('endpoint-response-actions');
      expect(skill.basePath).toBe('skills/security/endpoint');
      expect(skill.description).toContain('endpoint response actions');
      expect(skill.content).toContain('Endpoint Response Actions Skill');
    });

    it('includes system instructions in content', () => {
      const skill = createEndpointResponseActionsSkill();

      expect(skill.content).toContain('Endpoint Response Actions Skill');
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('Process');
      expect(skill.content).toContain('Guardrails');
    });

    it('exposes detailed reference material via referencedContent', () => {
      const skill = createEndpointResponseActionsSkill();

      expect(skill.referencedContent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'reference',
            content: expect.stringContaining('Error Handling Reference'),
          }),
        ])
      );
    });

    it('passes skill definition validation', async () => {
      const skill = createEndpointResponseActionsSkill();
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });
  });

  describe('getRegistryTools', () => {
    // The 7 response-action tools are now registered globally (see
    // ../../tools/register_tools.ts) so they appear in the Tools Library like
    // every other built-in tool. getRegistryTools binds them to this skill by
    // ID so the agent still exposes them whenever the skill is selected.
    it('returns exactly 7 tool IDs (list_endpoints, isolate_host, unisolate_host, get_endpoint_status, running_processes, scan, get_response_action_status)', async () => {
      const skill = createEndpointResponseActionsSkill();
      const toolIds = await skill.getRegistryTools?.();
      expect(toolIds).toHaveLength(7);
      expect(toolIds).toContain(LIST_ENDPOINTS_TOOL_ID);
      expect(toolIds).toContain(ISOLATE_TOOL_ID);
      expect(toolIds).toContain(UNISOLATE_TOOL_ID);
      expect(toolIds).toContain(GET_ENDPOINT_STATUS_TOOL_ID);
      expect(toolIds).toContain(RUNNING_PROCESSES_TOOL_ID);
      expect(toolIds).toContain(SCAN_TOOL_ID);
      expect(toolIds).toContain(GET_RESPONSE_ACTION_STATUS_TOOL_ID);
    });
  });
});
