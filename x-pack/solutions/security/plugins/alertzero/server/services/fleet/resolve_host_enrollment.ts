/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient } from '@kbn/fleet-plugin/server';
import type { ResolveHostEnrollment } from '../../step_types/package_report/read_current_run_state';

const escapeKuery = (value: string): string => value.replace(/(["\\])/g, '\\$1');

/**
 * Resolves a host name to its enrolled Elastic Defend agent id via Fleet.
 * `showInactive: false` excludes unenrolled/inactive agents, matching
 * Fleet's own definition of an active agent.
 */
export const makeResolveHostEnrollment = (
  agentClient: AgentClient | undefined
): ResolveHostEnrollment => {
  if (!agentClient) {
    return async () => ({ enrolled: false });
  }
  return async (hostName) => {
    const { agents } = await agentClient.listAgents({
      kuery: `local_metadata.host.hostname:"${escapeKuery(hostName)}"`,
      showInactive: false,
      perPage: 1,
    });
    const agent = agents[0];
    return agent ? { enrolled: true, agentId: agent.id } : { enrolled: false };
  };
};
