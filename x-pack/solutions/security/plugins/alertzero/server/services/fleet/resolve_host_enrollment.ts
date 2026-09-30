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
 * Resolves a host name to its enrolled Elastic Defend agent id via a space-scoped Fleet client.
 *
 * Both Fleet name fields are matched: the caller collects entities from either `host.name` or
 * `host.hostname`, and the two routinely differ on one machine. `showInactive: false` matches
 * Fleet's own definition of an active agent. Reporting an enrolled host as unenrolled is not
 * cosmetic -- it downgrades an executable response action to a recommendation.
 */
export const makeResolveHostEnrollment = (
  agentClient: AgentClient | undefined
): ResolveHostEnrollment => {
  if (!agentClient) {
    return async () => ({ enrolled: false });
  }
  return async (hostName) => {
    const escaped = escapeKuery(hostName);
    const { agents } = await agentClient.listAgents({
      kuery: `local_metadata.host.hostname:"${escaped}" or local_metadata.host.name:"${escaped}"`,
      showInactive: false,
      perPage: 1,
    });
    const agent = agents[0];
    return agent ? { enrolled: true, agentId: agent.id } : { enrolled: false };
  };
};

/**
 * Binds host enrollment lookups to the space the caller runs in, because hostnames are not
 * unique across spaces and an unscoped search can act on another space's agent.
 *
 * The service is read through a getter because step definitions register during `setup` but
 * run after `start`. Without a space there is no correct lookup to make, so every host reports
 * unenrolled -- a recommendation instead of an action, rather than acting on whichever space's
 * host matched first.
 */
export const makeScopedResolveHostEnrollment =
  (getAgentService: () => AgentService | undefined) =>
  (spaceId: string): ResolveHostEnrollment =>
    makeResolveHostEnrollment(
      spaceId ? getAgentService()?.asInternalScopedUser(spaceId) : undefined
    );
