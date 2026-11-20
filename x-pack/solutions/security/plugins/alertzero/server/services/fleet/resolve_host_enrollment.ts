/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentClient, AgentService } from '@kbn/fleet-plugin/server';

/**
 * `'reported'`: the endpoint's metadata was read, so `capabilities` is what it reports (possibly
 * none). `'unavailable'`: it could not be read, so `capabilities` is empty because nothing is
 * known, not because the endpoint reports none.
 */
export type CapabilitiesSource = 'reported' | 'unavailable';

export type HostEnrollment =
  | {
      enrolled: true;
      agentId: string;
      capabilities: string[];
      capabilitiesSource: CapabilitiesSource;
    }
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

interface EndpointCapabilities {
  capabilities: string[];
  capabilitiesSource: CapabilitiesSource;
}

const UNAVAILABLE: EndpointCapabilities = { capabilities: [], capabilitiesSource: 'unavailable' };

/**
 * Reads the endpoint's capability list from its metadata document. Conservative: a failed search
 * yields `[]` marked `'unavailable'`, and so does an empty result when the caller cannot read the
 * whole pattern, because an empty result is then ambiguous. Otherwise a missing document or
 * field yields `[]` marked `'reported'`. None of these skips the host; all mean "suspend only".
 */
const readEndpointCapabilities = async ({
  esClient,
  agentId,
  canReadWholePattern,
  logger,
}: {
  esClient: ElasticsearchClient;
  agentId: string;
  canReadWholePattern: boolean;
  logger?: Logger;
}): Promise<EndpointCapabilities> => {
  try {
    const response = await esClient.search<EndpointMetadataSource>({
      index: ENDPOINT_METADATA_CURRENT_PATTERN,
      size: 1,
      _source: ['Endpoint.capabilities'],
      // Same match and ordering as `getESQueryHostMetadataByIDs`: the id lives under either
      // field depending on the metadata version, and the newest document wins.
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { 'agent.id': agentId } },
                  { term: { 'HostDetails.agent.id': agentId } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      sort: [
        { 'event.created': { order: 'desc', unmapped_type: 'date' } },
        { 'HostDetails.event.created': { order: 'desc', unmapped_type: 'date' } },
      ],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    const [hit] = response.hits.hits;
    if (!hit && !canReadWholePattern) {
      return UNAVAILABLE;
    }
    const capabilities = hit?._source?.Endpoint?.capabilities;
    return {
      capabilities:
        Array.isArray(capabilities) &&
        capabilities.every((value): value is string => typeof value === 'string')
          ? capabilities
          : [],
      capabilitiesSource: 'reported',
    };
  } catch (error) {
    logger?.warn(
      `resolveHostEnrollment: endpoint capabilities lookup failed for agent ${agentId}; treating as unknown — ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return UNAVAILABLE;
  }
};

/**
 * Whether the calling identity can read the whole endpoint metadata pattern. A search by an
 * identity with no privilege on the pattern resolves to zero authorized indices and returns an
 * empty, error-free result rather than a 403, so the search cannot tell "unreadable" from "no
 * document". This probe can. It only says whether the whole pattern is covered, so a `false` does
 * not skip the search: a narrower grant can still find the document. A probe that cannot run is
 * treated as readable, so it never makes the outcome worse than searching without it.
 */
const canReadWholeEndpointMetadataPattern = async (
  esClient: ElasticsearchClient,
  logger?: Logger
): Promise<boolean> => {
  try {
    const { has_all_requested: hasAllRequested } = await esClient.security.hasPrivileges({
      index: [{ names: [ENDPOINT_METADATA_CURRENT_PATTERN], privileges: ['read'] }],
    });
    if (!hasAllRequested) {
      logger?.warn(
        `resolveHostEnrollment: caller lacks read privilege on ${ENDPOINT_METADATA_CURRENT_PATTERN}; a host with no readable metadata document in this run is treated as capabilities unknown`
      );
    }
    return hasAllRequested;
  } catch (error) {
    logger?.debug(
      `resolveHostEnrollment: privilege check for ${ENDPOINT_METADATA_CURRENT_PATTERN} failed; falling through to search — ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return true;
  }
};

/**
 * Resolves a host name to its enrolled Elastic Defend agent id via a space-scoped Fleet client,
 * plus the endpoint's reported capabilities when an ES client is available. Capabilities that
 * cannot be read come back empty with `capabilitiesSource: 'unavailable'`.
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
  // Probed on the first enrolled host and shared by every lookup this resolver makes, so one
  // packaging run costs one privilege check.
  let canReadWholePattern: Promise<boolean> | undefined;
  const readCapabilities = async (agentId: string): Promise<EndpointCapabilities> => {
    if (!esClient) {
      return UNAVAILABLE;
    }
    canReadWholePattern ??= canReadWholeEndpointMetadataPattern(esClient, logger);
    return readEndpointCapabilities({
      esClient,
      agentId,
      canReadWholePattern: await canReadWholePattern,
      logger,
    });
  };
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
    const { capabilities, capabilitiesSource } = await readCapabilities(agent.id);
    return { enrolled: true, agentId: agent.id, capabilities, capabilitiesSource };
  };
};

/**
 * Binds host enrollment lookups to the space the caller runs in, because hostnames are not
 * unique across spaces and an unscoped search can act on another space's agent.
 *
 * The service is read through a getter because step definitions register during `setup` but
 * run after `start`. The ES client is passed per call: it must be the step's own scoped client so
 * the calling user's privileges apply to the endpoint metadata read, not the internal user's. A
 * privilege self-check on that read is what makes a gap visible, because the search itself comes
 * back empty rather than denied. Without a space there is no correct lookup to make, so every
 * host reports unenrolled -- a recommendation instead of an action, rather than acting on
 * whichever space's host matched first.
 */
export const makeScopedResolveHostEnrollment =
  (getAgentService: () => AgentService | undefined, logger?: Logger) =>
  (spaceId: string, esClient?: ElasticsearchClient): ResolveHostEnrollment =>
    makeResolveHostEnrollment(
      spaceId ? getAgentService()?.asInternalScopedUser(spaceId) : undefined,
      esClient,
      logger
    );
