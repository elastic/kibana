/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient, AgentService } from '@kbn/fleet-plugin/server';
import type { ResolveHostEnrollment } from '../../step_types/package_report/read_current_run_state';

const escapeKuery = (value: string): string => value.replace(/(["\\])/g, '\\$1');

/**
 * Resolves a host name to its enrolled Elastic Defend agent id via Fleet.
 * `showInactive: false` excludes unenrolled/inactive agents, matching
 * Fleet's own definition of an active agent.
 *
 * The client must be space-scoped: hostnames are not unique across spaces, and an
 * unscoped search returns the first global match, which can enroll — and later act
 * on — an agent belonging to a different space.
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

/**
 * Binds host enrollment lookups to the space the caller is running in. The service is read
 * through a getter because step definitions register during `setup` but only run after
 * `start`, which is when Fleet's service becomes available.
 *
 * Without a space to scope to there is no correct lookup to make, so the resolver reports
 * every host unenrolled -- the same answer as a Fleet-less deployment. That mints a
 * recommendation instead of an executable action, which is the safe direction to fail: the
 * alternative is acting on whichever space's host happened to match first.
 */
export const makeScopedResolveHostEnrollment =
  (getAgentService: () => AgentService | undefined) =>
  (spaceId: string): ResolveHostEnrollment =>
    makeResolveHostEnrollment(
      spaceId ? getAgentService()?.asInternalScopedUser(spaceId) : undefined
    );
