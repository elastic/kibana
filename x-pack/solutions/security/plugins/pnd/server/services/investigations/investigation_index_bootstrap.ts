/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  canonicalProposalsMapping,
  evidenceMapping,
  investigationsMapping,
  MAPPINGS_VERSION,
  proposalsMapping,
  workerEvaluationsMapping,
} from './mappings';
import { realInvestigations, realProposals } from '../../routes/investigations/real_data';

export const PND_INVESTIGATIONS_INDEX = 'pnd-investigations';
export const PND_PROPOSALS_INDEX = 'pnd-proposals';
export const PND_EVIDENCE_INDEX = 'pnd-evidence';
export const PND_WORKER_EVAL_INDEX = 'pnd-worker-evaluations';
// Canonical Daybreak Proposal contract lives in its own index, separate from the
// UI proposal docs in PND_PROPOSALS_INDEX whose `evidenceRefs` is an array of
// rich UI-link objects. The canonical contract's `evidenceRefs` is an array of
// evidence ids (strings); mixing the two in one index conflicts the mapping.
export const PND_CANONICAL_PROPOSALS_INDEX = 'pnd-canonical-proposals';

/**
 * Owns the lifecycle of PND's five Elasticsearch indices: creation with
 * explicit mappings, migration off legacy `dynamic: true` mappings, and
 * demo-data seeding.
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc) so the read/write collaborators below
 * only depend on "an index is ready", not on how that readiness is achieved.
 * All of them share one instance so `ensureReady`'s memoized promise really
 * does run bootstrap at most once per plugin lifetime, matching the original
 * class's behavior exactly.
 */
export class InvestigationIndexBootstrap {
  private seedPromise?: Promise<void>;

  constructor(private readonly logger: Logger) {}

  /**
   * Create the investigations + proposals indices (if missing) and seed them
   * from the bundled demo data when empty, using the caller's privileges.
   *
   * Runs at most once per plugin lifetime (subsequent calls await the same
   * promise). We bootstrap lazily on the first authenticated request rather
   * than eagerly at start() because the Kibana internal user (kibana_system)
   * is not permitted to create arbitrary data indices — the request-scoped
   * user is.
   */
  public async ensureReady(esClient: ElasticsearchClient): Promise<void> {
    if (this.seedPromise == null) {
      this.seedPromise = this.bootstrap(esClient).catch((error) => {
        // Reset so a later request can retry rather than caching the failure.
        this.seedPromise = undefined;
        throw error;
      });
    }
    return this.seedPromise;
  }

  private async bootstrap(esClient: ElasticsearchClient): Promise<void> {
    await this.ensureIndex(esClient, PND_INVESTIGATIONS_INDEX, investigationsMapping);
    await this.ensureIndex(esClient, PND_PROPOSALS_INDEX, proposalsMapping);
    await this.ensureIndex(esClient, PND_EVIDENCE_INDEX, evidenceMapping);
    await this.ensureIndex(esClient, PND_WORKER_EVAL_INDEX, workerEvaluationsMapping);
    await this.ensureIndex(esClient, PND_CANONICAL_PROPOSALS_INDEX, canonicalProposalsMapping);
    await this.seedIfEmpty(esClient);
  }

  private async ensureIndex(
    esClient: ElasticsearchClient,
    index: string,
    mappings: MappingTypeMapping
  ): Promise<void> {
    const exists = await esClient.indices.exists({ index });

    if (exists) {
      if (await this.hasCurrentMappings(esClient, index)) {
        return;
      }
      // The index predates the explicit mappings (or was created against an
      // older revision). Its fields are typed wrong in ways that cannot be
      // fixed in place: ES forbids changing an existing field's type, so a
      // `confidence` mapped as `long` stays `long` and keeps truncating 0.85
      // to 0. Reindexing is not worth it here — every document in these
      // indices is either demo seed data or reproducible Watch output, so the
      // index is dropped and reseeded.
      //
      // This is a spike-scoped decision. A deployment that must preserve
      // analyst decisions across an upgrade needs a versioned index behind an
      // alias plus a reindex, not this.
      this.logger.warn(
        `PND: index ${index} has outdated mappings (expected _meta.mappingsVersion=${MAPPINGS_VERSION}); deleting and reseeding. Persisted documents in this index are discarded.`
      );
      await esClient.indices.delete({ index });
    }

    await esClient.indices.create({
      index,
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      // Explicit mappings: ids/enums are keyword so they can be filtered without
      // a `.keyword` suffix, scores keep their numeric type regardless of which
      // document lands first, and `events` is nested so per-event queries do not
      // match across the array. See ./mappings.ts.
      mappings: {
        ...mappings,
        // Stamped so a later boot can tell a current index from a stale one.
        _meta: { ...(mappings._meta ?? {}), mappingsVersion: MAPPINGS_VERSION },
      },
    });
    this.logger.info(`PND: created index ${index} (mappingsVersion ${MAPPINGS_VERSION})`);
  }

  /**
   * True when the index was created with the current mappings revision.
   * Anything else — a missing marker (created under `dynamic: true`) or an
   * older number — counts as stale.
   */
  private async hasCurrentMappings(esClient: ElasticsearchClient, index: string): Promise<boolean> {
    try {
      const response = await esClient.indices.getMapping({ index });
      const meta = response[index]?.mappings?._meta as { mappingsVersion?: number } | undefined;
      return meta?.mappingsVersion === MAPPINGS_VERSION;
    } catch (error) {
      // Treat an unreadable mapping as stale rather than assuming it is fine:
      // recreating is safe here, silently querying a mis-mapped index is not.
      this.logger.warn(`PND: could not read mappings for ${index}: ${error?.message}`);
      return false;
    }
  }

  private async seedIfEmpty(esClient: ElasticsearchClient): Promise<void> {
    const count = await esClient.count({ index: PND_INVESTIGATIONS_INDEX });
    if (count.count > 0) {
      return;
    }

    const operations: object[] = [];
    for (const investigation of realInvestigations) {
      operations.push({ index: { _index: PND_INVESTIGATIONS_INDEX, _id: investigation.id } });
      operations.push(investigation);
    }
    for (const [investigationId, proposals] of Object.entries(realProposals)) {
      for (const proposal of proposals) {
        operations.push({ index: { _index: PND_PROPOSALS_INDEX, _id: proposal.id } });
        operations.push({ ...proposal, investigationId });
      }
    }

    if (operations.length === 0) {
      return;
    }

    const bulkResponse = await esClient.bulk({ operations, refresh: true });
    if (bulkResponse.errors) {
      const firstError = bulkResponse.items.find((item) => item.index?.error)?.index?.error;
      throw new Error(`PND seed bulk failed: ${JSON.stringify(firstError)}`);
    }
    this.logger.info(
      `PND: seeded ${realInvestigations.length} investigations and proposals into ES`
    );
  }
}
