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
  ISOLATE_TOOL_ID,
  UNISOLATE_TOOL_ID,
  GET_ENDPOINT_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
  RUNNING_PROCESSES_TOOL_ID,
  SCAN_TOOL_ID,
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

    it('does not claim to be read-only and documents the shipped write-tool contract', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const reference =
        skill.referencedContent?.find((entry) => entry.name === 'reference')?.content ?? '';

      for (const text of [skill.description, skill.content, reference]) {
        expect(text).not.toMatch(/read-only/i);
        expect(text).not.toMatch(/only reads state/i);
        expect(text).not.toMatch(/cannot isolate, release, scan/i);
      }
      expect(skill.description).toMatch(/isolate or release/);
      expect(skill.description).toMatch(/malware scan/);
      expect(skill.description.length).toBeLessThanOrEqual(1024);

      // the unshipped actions stay refused
      expect(skill.content).toMatch(/execute, kill-process.*not available/s);
      expect(skill.content).toContain('Response Actions UI');

      // one contract: write tools are called directly, ambiguity handled by the tool
      expect(skill.content).toContain('call directly');
      expect(skill.content).toContain('ambiguous_hostname');
      expect(skill.content).toMatch(/no\s+\\?`?get_endpoint_status\\?`? pre-check/);
      expect(reference).not.toMatch(/Before isolate or release, call/);
      expect(reference).toMatch(/isolate_host.*directly/);
      // running processes enqueues a real action, so it is platform-confirmed too
      expect(skill.content).toContain(
        'running processes → `get_running_processes` (write, platform-confirmed)'
      );
      expect(skill.content).toMatch(/all four pause for\s+the analyst's confirmation/);
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

    it('dispatches multi-host requests sequentially and closes with an incident summary', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const reference =
        skill.referencedContent?.find((entry) => entry.name === 'reference')?.content ?? '';

      expect(skill.content).toContain('Multiple hosts or actions');
      expect(skill.content).toMatch(/one tool call per host per action/);
      expect(skill.content).toMatch(/Never batch/i);
      expect(skill.content).toContain('Do not retry or re-issue a declined');
      expect(skill.content).toContain('Closing incident summary');
      expect(skill.content).toContain('actions declined or cancelled');
      expect(skill.content).toContain('outstanding items');
      expect(reference).toContain('one tool call per host per action');
      expect(reference).toContain('incident summary');
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
  });

  describe('getInlineTools', () => {
    it('returns exactly 7 inline tools (list_endpoints, isolate_host, unisolate_host, get_endpoint_status, running_processes, scan, get_response_action_status)', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      expect(inlineTools).toHaveLength(7);
      const toolIds = (inlineTools ?? []).map((t) => t.id);
      expect(toolIds).toContain(LIST_ENDPOINTS_TOOL_ID);
      expect(toolIds).toContain(ISOLATE_TOOL_ID);
      expect(toolIds).toContain(UNISOLATE_TOOL_ID);
      expect(toolIds).toContain(GET_ENDPOINT_STATUS_TOOL_ID);
      expect(toolIds).toContain(RUNNING_PROCESSES_TOOL_ID);
      expect(toolIds).toContain(SCAN_TOOL_ID);
      expect(toolIds).toContain(GET_RESPONSE_ACTION_STATUS_TOOL_ID);
    });

    it('satisfies the 7-tool hard cap enforced by validateSkillDefinition', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('includes isolate_host tool', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const isolateTool = inlineTools?.find((tool) => tool.id === ISOLATE_TOOL_ID);

      expect(isolateTool).toBeDefined();
      expect(isolateTool?.description).toContain('Isolates a host');
    });

    it('includes unisolate_host tool', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const unisolateTool = inlineTools?.find((tool) => tool.id === UNISOLATE_TOOL_ID);

      expect(unisolateTool).toBeDefined();
      expect(unisolateTool?.description).toContain('Un-isolates a host');
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
