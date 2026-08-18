/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMetadataClient } from '@kbn/entity-store/server';
import type { RelationshipMetadataDoc } from '@kbn/entity-store/common';
import type { Logger } from '@kbn/core/server';
import type { ResolvedServiceDependency } from './resolve_downstream_services';
import { SERVICE_DEPENDENCY_KIND, toBackendTarget } from '../../../common/service_dependencies';

/**
 * Appends one `relationship_observed` doc per resolved (source, target) edge to the
 * entity metadata data stream. Each doc carries `@timestamp` and `Maintainer.lookback_window`
 * so the time-series edge list on the data stream is the source of truth for the service map
 * (rather than the union-accumulating latest index fields which never expire).
 *
 * For each source service, we emit one doc per edge:
 *   - **Resolved resource** (targets.length > 0): one doc per downstream service EUID, as today.
 *   - **Unresolved resource** (targets.length === 0): one doc with `depends_on.target` set to
 *     `>${resource}` (APM's caller-agnostic backend node convention). This is what makes
 *     `elasticsearch` appear as a shared dependency node rather than disappearing silently.
 *
 * Only writes docs for source entities that were successfully updated in phase 3,
 * mirroring the security engine's fan-out gating.
 */
export const writeRelationshipMetadata = async ({
  entityMetadataClient,
  resolved,
  succeededEntityIds,
  runStartedAt,
  lookbackWindow,
  logger,
}: {
  entityMetadataClient: EntityMetadataClient;
  resolved: Map<string, ResolvedServiceDependency>;
  succeededEntityIds: Set<string>;
  runStartedAt: string;
  /** Human-readable form of the query window, e.g. "1h". Stamped on metadata docs. */
  lookbackWindow: string;
  logger: Logger;
}): Promise<number> => {
  // Build the set of resources that resolved for ANY caller in this run.
  // Used to suppress phantom backend docs for resources that are provably instrumented services:
  // if synth-go's sample of api-gateway:3000 missed synth-java but synth-node's sample resolved
  // the same resource to synth-go, we know the resource IS a service — do not emit a
  // `>api-gateway:3000` backend doc for synth-go. The next run's different random sample
  // will recover the edge. This mirrors APM's per-caller independence but avoids propagating
  // the "wrong branch" conclusion across runs (metadata docs are append-only).
  const resolvedAnywhere = new Set<string>();
  for (const { resources } of resolved.values()) {
    for (const { resource, targets } of resources) {
      if (targets.length > 0) resolvedAnywhere.add(resource);
    }
  }

  const docs: RelationshipMetadataDoc[] = [];
  // Track (source, target) pairs to avoid duplicate docs within a single run.
  const emitted = new Set<string>();

  for (const [sourceService, { resources }] of resolved.entries()) {
    const sourceEuid = `service:${sourceService}`;
    // Only fan out metadata for entities that were successfully updated.
    if (!succeededEntityIds.has(sourceEuid)) continue;

    for (const { resource, targets } of resources) {
      if (targets.length > 0) {
        // Resolved: one doc per downstream service EUID (unchanged from previous behaviour).
        for (const targetEuid of targets) {
          // Guard self-edges — a service resolving back to itself is a misconfiguration.
          if (targetEuid === sourceEuid) continue;
          const edgeKey = `${sourceEuid}~${targetEuid}`;
          if (emitted.has(edgeKey)) continue;
          emitted.add(edgeKey);
          docs.push({
            '@timestamp': runStartedAt,
            'event.kind': 'event',
            'event.action': 'relationship_observed',
            'entity.id': sourceEuid,
            'entity.source': 'apm-exit-spans',
            'entity.relationships.depends_on.target': targetEuid,
            Maintainer: {
              kind: SERVICE_DEPENDENCY_KIND,
              scan_id: runStartedAt,
              lookback_window: lookbackWindow,
            },
          });
        }
      } else {
        // Unresolved: one doc with a caller-agnostic backend node id (`>${resource}`).
        // Two services calling the same resource will produce the same target value, so
        // the UI can share a single node for them — matching APM's getExitSpanNodeId behaviour.
        //
        // If any caller resolved this resource in this run, it is provably a service —
        // skip the backend doc and let the next run recover the service→service edge.
        if (resolvedAnywhere.has(resource)) continue;
        const backendTarget = toBackendTarget(resource);
        const edgeKey = `${sourceEuid}~${backendTarget}`;
        if (emitted.has(edgeKey)) continue;
        emitted.add(edgeKey);
        docs.push({
          '@timestamp': runStartedAt,
          'event.kind': 'event',
          'event.action': 'relationship_observed',
          'entity.id': sourceEuid,
          'entity.source': 'apm-exit-spans',
          'entity.relationships.depends_on.target': backendTarget,
          Maintainer: {
            kind: SERVICE_DEPENDENCY_KIND,
            scan_id: runStartedAt,
            lookback_window: lookbackWindow,
          },
        });
      }
    }
  }

  if (docs.length === 0) return 0;

  const result = await entityMetadataClient.bulkAppendMetadata(docs).catch((err: Error) => {
    logger.warn(`[service-dependencies] Failed to write relationship metadata: ${err.message}`);
    return { successful: 0, failed: docs.length, dropsByType: [] };
  });

  logger.debug(
    `[service-dependencies] Wrote ${result.successful} relationship_observed docs (${docs.length} total), dropped ${result.failed}`
  );

  return result.successful;
};
