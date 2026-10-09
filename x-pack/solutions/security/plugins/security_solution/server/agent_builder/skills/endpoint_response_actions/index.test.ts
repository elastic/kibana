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
      expect(skill.description).toContain('List enrolled Elastic Defend endpoints');
      expect(skill.description).toContain('elastic-defend-configuration-troubleshooting');
      expect(skill.description).toContain('by hostname or agent ID');
      expect(skill.description).toContain('isolation state');
      expect(skill.description).toContain('response action by ID');
      expect(skill.content).toContain('Endpoint Response Actions Skill');
    });

    it('leads the description with the capability, not excluded intents', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const [firstSentence] = skill.description.split(/(?<=\.)\s/);
      expect(firstSentence).toMatch(/status|List/);
      expect(firstSentence).not.toMatch(/\bwhy\b|offline|missing|unhealthy/i);
      expect(skill.description).toContain('elastic-defend-configuration-troubleshooting');
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });

    it('stops diagnosis before routing to any response actions tool', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const process = skill.content.slice(skill.content.indexOf('## Process'));
      expect(process).toMatch(/0\. .*WHY.*unhealthy.*offline.*missing/);
      expect(process).toContain('WHY a response action');
      expect(process).toContain("do not call this skill's tools");
      expect(process).toContain('load elastic-defend-configuration-troubleshooting');
      expect(process.indexOf('0.')).toBeLessThan(process.indexOf('1.'));
    });

    it('includes system instructions in content', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      expect(skill.content).toContain('Endpoint Response Actions Skill');
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('host by hostname or agent ID');
      expect(skill.content).toContain(
        'response action failed — that routes to the elastic-defend-configuration-troubleshooting'
      );
      expect(skill.content).toContain('Process');
      expect(skill.content).toContain('Guardrails');
      expect(skill.content).toContain('does not restrict');
      expect(skill.content).toContain('other loaded skills');
      expect(skill.content).not.toContain('Never use `platform.core.search`');
    });

    it('exposes detailed reference material via referencedContent', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const reference =
        skill.referencedContent?.find((entry) => entry.name === 'reference')?.content ?? '';
      expect(reference).toContain('Error Handling Reference');
      expect(reference).toContain('Other skills');
      expect(reference).not.toContain('for endpoint or response action state');
      expect(reference).toContain('get_endpoint_status');
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

    it('distinguishes not-found reasons from error codes in the reference doc', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      // A missing host or action comes back as `found: false` + `reason`, not
      // as an `error`. Naming a reason an error is what makes the model treat
      // a normal not-found as an unexpected result instead of asking the
      // analyst to verify the id. The exact contract lives in the reference
      // doc the skill points the model to for error-code handling.
      const reference = skill.referencedContent?.find((c) => c.name === 'reference')?.content;
      expect(reference).toContain('reason: endpoint_not_found');
      expect(reference).toContain('reason: action_not_found');
      expect(reference).toContain('error: insufficient_privileges');
      expect(reference).toContain('error: unknown_error');
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
