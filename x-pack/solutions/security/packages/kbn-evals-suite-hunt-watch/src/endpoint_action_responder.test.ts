/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0; you may not
 * use this file except in compliance with the Elastic License 2.0.
 */

import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  HUNT_AGENT_ID,
  HUNT_HOST_NAME,
  SUSPENDED_PROCESS_PID,
  buildSuspendProcessResponseDoc,
} from './endpoint_action_responder';

const readRepoFile = (...segments: string[]): string =>
  readFileSync(Path.join(REPO_ROOT, ...segments), 'utf8');

const packHostCorrelationSource = readRepoFile(
  'x-pack/solutions/security/plugins/security_solution/scripts/data/lib/pack_host_correlation.ts'
);

describe('endpoint action responder', () => {
  it('keys on the same agent, host and process the aws-iam pack seeds', () => {
    // The responder answers actions dispatched to the seeded WIN-ANALYST01 agent and reports
    // the aws.exe pid the process tree names. If the generator drifts (agent id, host name,
    // aws.exe pid), the approve path silently stops working live, so pin the literals here.
    expect(packHostCorrelationSource).toContain(`agentId: '${HUNT_AGENT_ID}'`);
    expect(packHostCorrelationSource).toContain(`hostName: '${HUNT_HOST_NAME}'`);
    expect(packHostCorrelationSource).toContain(`pid: ${SUSPENDED_PROCESS_PID}`);
    expect(packHostCorrelationSource).toContain(`name: 'aws.exe'`);
  });

  it('reports the suspend-process command the action log records', () => {
    const doc = buildSuspendProcessResponseDoc('test-action');
    expect(doc.EndpointActions.data.command).toBe('suspend-process');
    expect(doc.EndpointActions.action_id).toBe('test-action');
    // `ra_suspend-process_success_done` is the code the action-details read treats as success.
    expect(doc.EndpointActions.data.output.content.code).toBe('ra_suspend-process_success_done');
  });
});
