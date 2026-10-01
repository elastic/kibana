/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentClient, AgentService } from '@kbn/fleet-plugin/server';

export type HostEnrollment =
  | { enrolled: true; agentId: string; capabilities: string[] }
  | { enrolled: false };

/**
 * Declared with its implementation so packaging depends on this service for the contract, rather
 * than this service reaching into packaging for the shape of its own return value.
 */
export type ResolveHostEnrollment = (hostName: string) => Promise<HostEnrollment>;

/**
 * Where Elastic Defend reports `Endpoint.capabilities`, keyed by `agent.id`. Mirrors
 * `metadataCurrentIndexPattern` in `security_solution/common/endpoint/constants.ts`, which
 * alertzero cannot import across the plugin boundary.
 */
export const ENDPOINT_METADATA_CURRENT_PATTERN = 'metrics-endpoint.metadata_current_*';

const escapeKuery = (value: string): string => value.replace(/(["\\])/g, '\\$1');

interface EndpointMetadataSource {
  Endpoint?: { capabilities?: unknown };
}

/**
 * Reads the endpoint's capability list from its metadata document. Conservative: a missing
 * index, document, or field, or any error, yields `[]` ("suspend only"), never a skipped host.
 */
const readEndpointCapabilities = async ({
  esClient,
  agentId,
  logger,
}: {
  esClient: ElasticsearchClient;
  agentId: string;
  logger?: Logger;
}): Promise<string[]> => {
  try {
    const response = await esClient.search<EndpointMetadataSource>({
      index: ENDPOINT_METADATA_CURRENT_PATTERN,
      size: 1,
      _source: ['Endpoint.capabilities'],
      query: { term: { 'agent.id': agentId } },
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    const capabilities = response.hits.hits[0]?._source?.Endpoint?.capabilities;
    return Array.isArray(capabilities) &&
      capabilities.every((value): value is string => typeof value === 'string')
      ? capabilities
      : [];
  } catch (error) {
    logger?.debug(
      `resolveHostEnrollment: endpoint capabilities lookup failed for agent ${agentId}; treating as none — ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
};

/**
 * Resolves a host name to its enrolled Elastic Defend agent id via a space-scoped Fleet client,
 * plus the endpoint's reported capabilities when an ES client is available.
 *
 * Both Fleet name fields are matched: the caller collects entities from either `host.name` or
 * `host.hostname`, and the two routinely differ on one machine. `showInactive: false` matches
 * Fleet's own definition of an active agent. Reporting an enrolled host as unenrolled is not
 * cosmetic -- it downgrades an executable response action to a recommendation.
 *
 * A host name is not unique within a space either: a re-enrolled machine or a cloned image can
 * leave two active agents answering to the same name. Two matches resolve to unenrolled rather
 * than to whichever Fleet returned first, because the action this feeds isolates or kills on the
 * agent id -- picking arbitrarily would act on a machine nobody named.
 */
export const makeResolveHostEnrollment = (
  agentClient: AgentClient | undefined,
  esClient?: ElasticsearchClient,
  logger?: Logger
): ResolveHostEnrollment => {
  if (!agentClient) {
    return async () => ({ enrolled: false });
  }
  return async (hostName) => {
    const escaped = escapeKuery(hostName);
    let agent: { id: string } | undefined;
    try {
      // Two, not one: a second match is the signal that the name is ambiguous, and the lookup
      // cannot see that with a page size of one.
      const { agents } = await agentClient.listAgents({
        kuery: `local_metadata.host.hostname:"${escaped}" or local_metadata.host.name:"${escaped}"`,
        showInactive: false,
        perPage: 2,
      });
      if (agents.length > 1) {
        logger?.warn(
          `resolveHostEnrollment: "${hostName}" matches more than one active agent in this space, treating it as unenrolled`
        );
        return { enrolled: false };
      }
      agent = agents[0];
    } catch (err) {
      // A Fleet outage must not sink packaging. The hunt writes its evidence before packaging
      // runs, so the report is no longer swept automatically, and failing here would strand a
      // confirmed hit outside the Proposal queue until someone reran it by hand. An unknown host
      // takes the same downgrade a Fleet-less deployment gets: the finding is still packaged, as
      // a recommendation rather than an executable action.
      logger?.warn(
        `resolveHostEnrollment: Fleet agent lookup failed for "${hostName}", treating it as unenrolled — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return { enrolled: false };
    }
    if (!agent) {
      return { enrolled: false };
    }
    const capabilities = esClient
      ? await readEndpointCapabilities({ esClient, agentId: agent.id, logger })
      : [];
    return { enrolled: true, agentId: agent.id, capabilities };
  };
};

/**
 * Binds host enrollment lookups to the space the caller runs in, because hostnames are not
 * unique across spaces and an unscoped search can act on another space's agent.
 *
 * The service and ES client are read through getters because step definitions register during
 * `setup` but run after `start`. Without a space there is no correct lookup to make, so every
 * host reports unenrolled -- a recommendation instead of an action, rather than acting on
 * whichever space's host matched first.
 */
export const makeScopedResolveHostEnrollment =
  (
    getAgentService: () => AgentService | undefined,
    getEsClient: () => ElasticsearchClient | undefined,
    logger?: Logger
  ) =>
  (spaceId: string): ResolveHostEnrollment =>
    makeResolveHostEnrollment(
      spaceId ? getAgentService()?.asInternalScopedUser(spaceId) : undefined,
      getEsClient(),
      logger
    );
