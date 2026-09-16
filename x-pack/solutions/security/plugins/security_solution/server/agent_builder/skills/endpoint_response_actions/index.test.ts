/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import {
  createEndpointResponseActionsSkill,
  GET_ENDPOINT_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
  GET_RESPONSE_ACTION_STATUS_TOOL_ID,
} from '.';

describe('createEndpointResponseActionsSkill', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('skill definition', () => {
    it('returns a valid skill definition', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      expect(skill).toBeDefined();
      expect(skill.id).toBe('endpoint-response-actions');
      expect(skill.name).toBe('endpoint-response-actions');
      expect(skill.basePath).toBe('skills/security/endpoint');
      expect(skill.description).toContain('endpoint response action');
      expect(skill.content).toContain('Endpoint Response Actions Skill');
    });

    it('includes system instructions in content', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      expect(skill.content).toContain('Endpoint Response Actions Skill');
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('Process');
      expect(skill.content).toContain('Guardrails');
    });

    it('exposes detailed reference material via referencedContent', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      expect(skill.referencedContent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'reference',
            content: expect.stringContaining('Error Handling Reference'),
          }),
        ])
      );
    });

    it('declares itself read-only and names the write actions it cannot perform', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      // This slice ships read-only tools. The instructions must say so
      // explicitly, otherwise the agent is free to claim it isolated a host
      // it never touched, or to improvise a write via another skill's tools.
      expect(skill.content).toContain('read-only');
      expect(skill.description).toContain('Read-only');
      for (const writeAction of ['isolate', 'release', 'scan']) {
        expect(skill.content).toContain(writeAction);
      }
    });
  });

  describe('getInlineTools', () => {
    it('returns exactly the 3 read-only inline tools (list_endpoints, get_endpoint_status, get_response_action_status)', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      expect(inlineTools).toHaveLength(3);
      const toolIds = (inlineTools ?? []).map((t) => t.id);
      expect(toolIds).toEqual(
        expect.arrayContaining([
          LIST_ENDPOINTS_TOOL_ID,
          GET_ENDPOINT_STATUS_TOOL_ID,
          GET_RESPONSE_ACTION_STATUS_TOOL_ID,
        ])
      );
    });

    it('exposes no write/state-changing tools in this slice', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const toolIds = (inlineTools ?? []).map((t) => t.id);

      // Guards the slice boundary: a write tool re-added to `getInlineTools`
      // without its confirmation/authz review must fail here rather than ship
      // silently under a skill the analyst was told is read-only.
      for (const writeToolId of [
        'endpoint-response-actions.isolate_host',
        'endpoint-response-actions.unisolate_host',
        'endpoint-response-actions.scan',
        'endpoint-response-actions.running_processes',
      ]) {
        expect(toolIds).not.toContain(writeToolId);
      }
    });

    it('satisfies the 7-tool hard cap enforced by validateSkillDefinition', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('includes list_endpoints tool', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const listTool = inlineTools?.find((tool) => tool.id === LIST_ENDPOINTS_TOOL_ID);

      expect(listTool).toBeDefined();
    });

    it('includes get_endpoint_status tool', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      expect(statusTool).toBeDefined();
      expect(statusTool?.description).toContain('Retrieves the current status');
    });

    it('includes get_response_action_status tool', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const statusTool = inlineTools?.find(
        (tool) => tool.id === GET_RESPONSE_ACTION_STATUS_TOOL_ID
      );

      expect(statusTool).toBeDefined();
      expect(statusTool?.description).toContain('action ID');
    });
  });
});
