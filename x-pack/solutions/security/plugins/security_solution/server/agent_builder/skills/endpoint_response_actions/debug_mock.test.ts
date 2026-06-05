/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import { createEndpointResponseActionsSkill, ISOLATE_TOOL_ID } from '.';

describe('debug mock behavior', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  it('debug: what does asInternalUser.list return?', async () => {
    const fs = mockEndpointAppContextService.getInternalFleetServices('default');
    console.log('agentService:', fs.agentService);
    console.log('asInternalUser:', fs.agentService.asInternalUser);
    console.log('list method:', fs.agentService.asInternalUser.list);
    const result = await fs.agentService.asInternalUser.list({
      kuery: 'host.name: test',
      page: 1,
      perPage: 1,
    });
    console.log('result:', JSON.stringify(result));
    console.log('result.items:', result?.items);
    console.log('result.items?.length:', result?.items?.length);
    console.log('!result?.items?.length:', !result?.items?.length);
  });

  it('isolate_host handler result', async () => {
    const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
    const inlineTools = await skill.getInlineTools?.();
    const isolateTool = inlineTools?.find((tool) => tool.id === ISOLATE_TOOL_ID);

    const result = await (isolateTool?.handler as Function)(
      { hostName: 'nonexistent-host', comment: 'test' },
      { logger: { error: jest.fn() } }
    );
    console.log('isolate result:', JSON.stringify(result, null, 2));
  });
});
