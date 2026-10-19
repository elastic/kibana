/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointResponseActionsRouting } from './endpoint_response_actions_routing_evaluator';
import {
  createEndpointResponseActionsRoutingEvaluator,
  ENDPOINT_RESPONSE_ACTIONS_SKILL_ID,
  GET_ENDPOINT_STATUS_TOOL_ID,
  GET_RESPONSE_ACTION_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
} from './endpoint_response_actions_routing_evaluator';

// Pins the mirrored tool id contract to the skill's `toolName` convention
// (`${ID}.${name}` with ID 'endpoint-response-actions', from
// security_solution/server/agent_builder/skills/endpoint_response_actions/index.ts).
describe('endpoint response actions tool id contract', () => {
  it('mirrors the ids exported by the endpoint response actions skill', () => {
    expect(GET_ENDPOINT_STATUS_TOOL_ID).toBe(
      `${ENDPOINT_RESPONSE_ACTIONS_SKILL_ID}.get_endpoint_status`
    );
    expect(LIST_ENDPOINTS_TOOL_ID).toBe(`${ENDPOINT_RESPONSE_ACTIONS_SKILL_ID}.list_endpoints`);
    expect(GET_RESPONSE_ACTION_STATUS_TOOL_ID).toBe(
      `${ENDPOINT_RESPONSE_ACTIONS_SKILL_ID}.get_response_action_status`
    );
  });
});

const evaluateWith = async ({
  routing = 'forbid',
  requiredTool,
  steps = [],
}: {
  routing?: EndpointResponseActionsRouting;
  requiredTool?: string;
  steps?: unknown[];
}) =>
  createEndpointResponseActionsRoutingEvaluator().evaluate({
    input: { question: 'unused' },
    output: { steps },
    expected: {
      criteria: [],
      routing,
      ...(requiredTool ? { required_tool: requiredTool } : {}),
    },
    metadata: {},
  });

describe('createEndpointResponseActionsRoutingEvaluator', () => {
  it('mixed row passes with troubleshooting skill load even when ERA status is called', async () => {
    const result = await evaluateWith({
      routing: 'require_troubleshooting',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: {
            skill: 'skills/security/endpoint/elastic-defend-configuration-troubleshooting',
          },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('mixed row fails with only ERA status and no troubleshooting load', async () => {
    const result = await evaluateWith({
      routing: 'require_troubleshooting',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('mixed row rejects an errored troubleshooting load even with ERA status', async () => {
    const result = await evaluateWith({
      routing: 'require_troubleshooting',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'elastic-defend-configuration-troubleshooting' },
          results: [{ type: 'error' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('mixed row accepts troubleshooting SKILL.md read with ERA status', async () => {
    const result = await evaluateWith({
      routing: 'require_troubleshooting',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
        {
          type: 'tool_call',
          tool_id: 'read_file',
          params: {
            path: '/skills/security/endpoint/elastic-defend-configuration-troubleshooting/SKILL.md',
          },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('negative row with only troubleshooting tools passes', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: {
            skill: 'skills/security/endpoint/elastic-defend-configuration-troubleshooting',
          },
          results: [{ type: 'resource' }],
        },
        {
          type: 'tool_call',
          tool_id: 'automatic_troubleshooting.generate_insight',
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('negative row with an endpoint response actions tool call fails', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: LIST_ENDPOINTS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('negative row with an endpoint response actions skill load fails', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'endpoint-response-actions' },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('negative row with a legacy filestore.read of the skill SKILL.md fails', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: 'filestore.read',
          params: { path: 'skills/security/endpoint/endpoint-response-actions/SKILL.md' },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('negative row with a read_file of the skill SKILL.md fails', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: 'read_file',
          params: { path: '/skills/security/endpoint/endpoint-response-actions/SKILL.md' },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('negative row with a read_file of only the troubleshooting SKILL.md passes', async () => {
    const result = await evaluateWith({
      steps: [
        {
          type: 'tool_call',
          tool_id: 'read_file',
          params: {
            path: '/skills/security/endpoint/elastic-defend-configuration-troubleshooting/SKILL.md',
          },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('positive row with get_endpoint_status passes', async () => {
    const result = await evaluateWith({
      routing: 'require',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('positive row without get_endpoint_status fails', async () => {
    const result = await evaluateWith({
      routing: 'require',
      steps: [
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: {
            skill: 'skills/security/endpoint/elastic-defend-configuration-troubleshooting',
          },
          results: [{ type: 'resource' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });

  it('positive row where get_endpoint_status only errored fails', async () => {
    const result = await evaluateWith({
      routing: 'require',
      steps: [
        {
          type: 'tool_call',
          tool_id: GET_ENDPOINT_STATUS_TOOL_ID,
          results: [{ type: 'error' }],
        },
      ],
    });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });
});
