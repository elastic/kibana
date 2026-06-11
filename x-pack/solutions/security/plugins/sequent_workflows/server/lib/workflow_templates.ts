/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { dump } from 'js-yaml';

function mainWorkflow(
  baseUrl: string,
  runId: string,
  childHorde: string,
  childSepRally: string
): object {
  return {
    name: `sequent-main-workflow-${runId}`,
    description: 'Orchestrates sequential and parallel execution steps',
    enabled: true,
    consts: { base_url: baseUrl },
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'healthcheck',
        type: 'http',
        with: {
          url: '{{ consts.base_url }}/api/v1/healthcheck',
          method: 'GET',
        },
      },
      {
        name: 'execute_sec_loadstar',
        type: 'http',
        with: {
          url: '{{ consts.base_url }}/api/v1/execute/sec-loadstar',
          method: 'POST',
        },
      },
      {
        name: 'poll_sec_loadstar',
        type: 'while',
        condition: '${{ steps.check_sec_loadstar.output.data.status == "working" }}',
        'max-iterations': { limit: 30, 'on-limit': 'fail' },
        steps: [
          {
            name: 'check_sec_loadstar',
            type: 'http',
            with: {
              url: '{{ consts.base_url }}/api/v1/status/sec-loadstar',
              method: 'GET',
            },
          },
          {
            name: 'wait_poll',
            type: 'wait',
            with: { duration: '5s' },
          },
        ],
      },
      {
        name: 'run_horde',
        type: 'workflow.executeAsync',
        with: { 'workflow-id': childHorde },
      },
      {
        name: 'run_sep_rally',
        type: 'workflow.executeAsync',
        with: { 'workflow-id': childSepRally },
      },
      {
        name: 'await_children',
        type: 'while',
        condition:
          '${{ steps.check_horde_status.output.status == "running" or steps.check_horde_status.output.status == "pending" or steps.check_horde_status.output.status == "waiting" or steps.check_horde_status.output.status == "waiting_for_child" or steps.check_sep_rally_status.output.status == "running" or steps.check_sep_rally_status.output.status == "pending" or steps.check_sep_rally_status.output.status == "waiting" or steps.check_sep_rally_status.output.status == "waiting_for_child" }}',
        'max-iterations': { limit: 60, 'on-limit': 'fail' },
        steps: [
          {
            name: 'check_horde_status',
            type: 'kibana.request',
            with: {
              use_server_info: true,
              fetcher: { skip_ssl_verification: true },
              method: 'GET',
              path: '/api/workflows/executions/{{ steps.run_horde.output.executionId }}',
              headers: {
                'elastic-api-version': '2023-10-31',
              },
            },
          },
          {
            name: 'check_sep_rally_status',
            type: 'kibana.request',
            with: {
              use_server_info: true,
              fetcher: { skip_ssl_verification: true },
              method: 'GET',
              path: '/api/workflows/executions/{{ steps.run_sep_rally.output.executionId }}',
              headers: {
                'elastic-api-version': '2023-10-31',
              },
            },
          },
          {
            name: 'wait_children_poll',
            type: 'wait',
            with: { duration: '5s' },
          },
        ],
      },
      {
        name: 'success',
        type: 'console',
        with: { message: 'All steps completed successfully' },
      },
    ],
  };
}

function childWorkflow(name: string, taskName: string, baseUrl: string): object {
  const safe = taskName.replace(/-/g, '_');
  return {
    name,
    description: `Child workflow for ${taskName} execution and polling`,
    enabled: true,
    consts: { base_url: baseUrl },
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: `execute_${safe}`,
        type: 'http',
        with: {
          url: `{{ consts.base_url }}/api/v1/execute/${taskName}`,
          method: 'POST',
        },
      },
      {
        name: `poll_${safe}`,
        type: 'while',
        condition: `\${{ steps.check_${safe}.output.data.status == "working" }}`,
        'max-iterations': { limit: 30, 'on-limit': 'fail' },
        steps: [
          {
            name: `check_${safe}`,
            type: 'http',
            with: {
              url: `{{ consts.base_url }}/api/v1/status/${taskName}`,
              method: 'GET',
            },
          },
          {
            name: 'wait_poll',
            type: 'wait',
            with: { duration: '5s' },
          },
        ],
      },
    ],
  };
}

export interface GeneratedWorkflows {
  runId: string;
  mainName: string;
  childNames: string[];
  yamls: Record<string, string>;
}

export function generateWorkflowYamls(baseUrl: string): GeneratedWorkflows {
  const runId = crypto.randomBytes(4).toString('hex');
  const mainName = `sequent-main-workflow-${runId}`;
  const childHorde = `sequent-child-horde-${runId}`;
  const childSepRally = `sequent-child-sep-rally-${runId}`;

  const definitions: Record<string, object> = {
    [mainName]: mainWorkflow(baseUrl, runId, childHorde, childSepRally),
    [childHorde]: childWorkflow(childHorde, 'horde', baseUrl),
    [childSepRally]: childWorkflow(childSepRally, 'sep-rally', baseUrl),
  };

  const yamls: Record<string, string> = {};
  for (const [name, def] of Object.entries(definitions)) {
    yamls[name] = dump(def, { noRefs: true, sortKeys: false, lineWidth: -1 });
  }

  return {
    runId,
    mainName,
    childNames: [childHorde, childSepRally],
    yamls,
  };
}
