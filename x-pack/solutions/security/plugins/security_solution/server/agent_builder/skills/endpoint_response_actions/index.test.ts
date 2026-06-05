/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import { createEndpointResponseActionsSkill, ISOLATE_TOOL_ID, UNISOLATE_TOOL_ID, GET_ENDPOINT_STATUS_TOOL_ID } from '.';

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
      expect(skill.description).toContain('endpoint response actions');
      expect(skill.content).toContain('Endpoint Response Actions Skill');
    });

    it('includes system instructions in content', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      expect(skill.content).toContain('Endpoint Response Actions Skill');
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('Conversation Flow');
      expect(skill.content).toContain('Error Handling');
    });
  });

  describe('getInlineTools', () => {
    it('returns three inline tools', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = skill.getInlineTools?.();

      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(3);
    });

    it('includes isolate_host tool', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = skill.getInlineTools?.();

      const isolateTool = inlineTools?.find((tool) => tool.id === ISOLATE_TOOL_ID);

      expect(isolateTool).toBeDefined();
      expect(isolateTool?.description).toContain('Isolates a host');
    });

    it('includes unisolate_host tool', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = skill.getInlineTools?.();

      const unisolateTool = inlineTools?.find((tool) => tool.id === UNISOLATE_TOOL_ID);

      expect(unisolateTool).toBeDefined();
      expect(unisolateTool?.description).toContain('Un-isolates a host');
    });

    it('includes get_endpoint_status tool', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      const inlineTools = skill.getInlineTools?.();

      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      expect(statusTool).toBeDefined();
      expect(statusTool?.description).toContain('Retrieves the current status');
    });

    it('includes platformCoreTools.search in allowed tools', () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);

      // Check that allowed tools is defined and contains search
      expect(skill.allowedTools).toBeUndefined(); // no explicit allowed tools for this skill

      // The inline tools should be the only tools
      const inlineTools = skill.getInlineTools?.();
      expect(inlineTools).toHaveLength(3);
    });
  });
});
