/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isComputedFeature } from '@kbn/significant-events-schema';
import { isConditionComplete } from '@kbn/streamlang';
import {
  isStoredFeatureKnowledgeIndicator,
  isStoredQueryKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
} from '../data_stream';
import {
  combineWhere,
  inPredicate,
  IS_DURABLE_OR_EXCLUDED,
  IS_NOT_DELETED,
  olderThan,
} from '../esql_helpers';
import { ID, SOURCE_ID } from '../fields';
import {
  computeExpiresAt,
  fromStoredFeature,
  fromStoredQuery,
  toStoredFeature,
  toStoredQuery,
  toTombstone,
} from './serializers';
import {
  bulkCreateWithInferenceFallback,
  countRawBulkInferenceErrors,
} from './bulk_with_inference_fallback';
import { StatusError } from '../../errors/status_error';
import type { RevisionReader } from './revision_reader';
import type { KIBulkOperation, KnowledgeIndicatorDataStreamClient } from './types';

export class IndicatorWriter {
  constructor(
    private readonly dataStreamClient: KnowledgeIndicatorDataStreamClient,
    private readonly logger: Logger,
    private readonly revisionReader: RevisionReader,
    private readonly ttlDays: number,
    private readonly space: string
  ) {}

  async bulk(
    sourceId: string,
    operations: KIBulkOperation[]
  ): Promise<{ applied: number; skipped: number }> {
    if (operations.length === 0) {
      return { applied: 0, skipped: 0 };
    }

    this.assertFeatureFiltersComplete(operations);

    const now = new Date().toISOString();

    const [
      { excludableLatest, skipped: excludeSkipped },
      { restorableLatest, skipped: restoreSkipped },
      { deletableOps, skipped: deleteSkipped },
    ] = await Promise.all([
      this.prepareExcludes(sourceId, operations),
      this.prepareRestores(sourceId, operations),
      this.prepareDeletes(sourceId, operations),
    ]);

    const indexOpsCount = operations.filter((op) => 'index' in op).length;
    const totalApplied =
      indexOpsCount + excludableLatest.length + restorableLatest.length + deletableOps.length;
    const totalSkipped = excludeSkipped + restoreSkipped + deleteSkipped;

    if (totalApplied === 0) {
      return { applied: 0, skipped: totalSkipped };
    }

    await bulkCreateWithInferenceFallback(this.logger, ({ includeEmbedding }) =>
      this.dataStreamClient.create({
        space: this.space,
        refresh: 'wait_for',
        documents: this.buildBulkDocs(sourceId, operations, {
          excludableLatest,
          restorableLatest,
          deletableOps,
          includeEmbedding,
          now,
        }) as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
      })
    );

    return { applied: totalApplied, skipped: totalSkipped };
  }

  /**
   * Feature index ops must carry a complete condition — reject incomplete
   * filters up front rather than persisting an unusable revision.
   */
  private assertFeatureFiltersComplete(operations: KIBulkOperation[]): void {
    for (const op of operations) {
      if ('index' in op && 'feature' in op.index) {
        const f = op.index.feature;
        if (f.filter && !isConditionComplete(f.filter)) {
          throw new StatusError(`Invalid feature ${f.id}: filter is incomplete`, 400);
        }
      }
    }
  }

  /**
   * Exclude requires a pre-read: the new revision must preserve the full
   * feature payload so the Excluded tab can render it and downstream
   * consumers (LLM dedup hint) have the fingerprint. Unknown, computed, and
   * already-excluded ids are skipped (they'd create orphans or churn).
   */
  private async prepareExcludes(
    sourceId: string,
    operations: KIBulkOperation[]
  ): Promise<{ excludableLatest: StoredFeatureKnowledgeIndicator[]; skipped: number }> {
    const excludeOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { exclude: unknown }> => 'exclude' in op
    );
    const excludeIds = new Set(excludeOps.map((op) => op.exclude.id));
    if (excludeIds.size === 0) {
      return { excludableLatest: [], skipped: 0 };
    }

    const excludeLatest = await this.revisionReader.fetchLatestFeatures(sourceId, [...excludeIds]);
    const excludableLatest: StoredFeatureKnowledgeIndicator[] = [];
    let skipped = 0;
    for (const id of excludeIds) {
      const latest = excludeLatest.find((doc) => doc.id === id);
      if (!latest) {
        // Unknown id → no-op. Excluding an id that doesn't exist would
        // create an orphan revision; treat as skipped.
        skipped += 1;
        continue;
      }
      const asFeature = fromStoredFeature(latest);
      if (isComputedFeature(asFeature)) {
        // Computed features are derived; excluding them is meaningless
        // (they would be regenerated on the next run). Skip.
        skipped += 1;
        continue;
      }
      if (latest.excluded === true) {
        // Already excluded — avoid churn revisions that would add no
        // information and only consume retention.
        skipped += 1;
        continue;
      }
      excludableLatest.push(latest);
    }
    return { excludableLatest, skipped };
  }

  /**
   * Restore requires a pre-read: the full feature payload is needed so we
   * can re-index it with `excluded` cleared and fresh timestamps.
   */
  private async prepareRestores(
    sourceId: string,
    operations: KIBulkOperation[]
  ): Promise<{ restorableLatest: StoredFeatureKnowledgeIndicator[]; skipped: number }> {
    const restoreOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { restore: unknown }> => 'restore' in op
    );
    const restoreIds = new Set(restoreOps.map((op) => op.restore.id));
    if (restoreIds.size === 0) {
      return { restorableLatest: [], skipped: 0 };
    }

    const restoreLatest = await this.revisionReader.fetchLatestFeatures(sourceId, [...restoreIds]);
    const restorableLatest: StoredFeatureKnowledgeIndicator[] = [];
    let skipped = 0;
    for (const id of restoreIds) {
      const latest = restoreLatest.find((doc) => doc.id === id);
      if (!latest) {
        skipped += 1;
        continue;
      }
      const asFeature = fromStoredFeature(latest);
      if (isComputedFeature(asFeature)) {
        skipped += 1;
        continue;
      }
      restorableLatest.push(latest);
    }
    return { restorableLatest, skipped };
  }

  /**
   * Delete requires a pre-read so we can skip unknown/non-existent ids
   * rather than writing tombstones for them (which would count as applied).
   *
   * Deletes target both features and queries (query deletes flow through this
   * path too), and identity is `(type, id)` — so the existence check spans all
   * types and matches on `type:id`, not feature revisions alone.
   */
  private async prepareDeletes(
    sourceId: string,
    operations: KIBulkOperation[]
  ): Promise<{
    deletableOps: Array<Extract<KIBulkOperation, { delete: unknown }>>;
    skipped: number;
  }> {
    const deleteOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { delete: unknown }> => 'delete' in op
    );
    const deleteIds = new Set(deleteOps.map((op) => op.delete.id));
    if (deleteIds.size === 0) {
      return { deletableOps: [], skipped: 0 };
    }

    const deleteLatest = await this.revisionReader.fetchLatestRevisions(
      combineWhere(inPredicate(SOURCE_ID, [sourceId]), inPredicate(ID, [...deleteIds])),
      IS_NOT_DELETED
    );
    const presentByTypeId = new Set(deleteLatest.map((doc) => `${doc.type}:${doc.id}`));
    const deletableOps: Array<Extract<KIBulkOperation, { delete: unknown }>> = [];
    let skipped = 0;
    for (const op of deleteOps) {
      if (presentByTypeId.has(`${op.delete.type}:${op.delete.id}`)) {
        deletableOps.push(op);
      } else {
        skipped += 1;
      }
    }
    return { deletableOps, skipped };
  }

  /**
   * Materializes the append-only revision documents for a single bulk attempt:
   * index ops (feature/query), exclude/restore re-indexes, and delete
   * tombstones. Called per attempt so `includeEmbedding` can toggle for the
   * inference fallback.
   */
  private buildBulkDocs(
    sourceId: string,
    operations: KIBulkOperation[],
    {
      excludableLatest,
      restorableLatest,
      deletableOps,
      includeEmbedding,
      now,
    }: {
      excludableLatest: StoredFeatureKnowledgeIndicator[];
      restorableLatest: StoredFeatureKnowledgeIndicator[];
      deletableOps: Array<Extract<KIBulkOperation, { delete: unknown }>>;
      includeEmbedding: boolean;
      now: string;
    }
  ): StoredKnowledgeIndicator[] {
    const docs: StoredKnowledgeIndicator[] = [];
    for (const op of operations) {
      if ('index' in op) {
        if ('feature' in op.index) {
          docs.push(
            toStoredFeature({
              sourceId,
              feature: op.index.feature,
              includeEmbedding,
              expiresAt: op.index.feature.expires_at,
            })
          );
        } else {
          docs.push(
            toStoredQuery({
              space: this.space,
              sourceId,
              query: op.index.query,
              includeEmbedding,
              expiresAt: op.index.query.expires_at,
            })
          );
        }
      }
    }
    for (const latest of excludableLatest) {
      const feature = fromStoredFeature(latest);
      const expiresAt = latest.expires_at ? computeExpiresAt(now, this.ttlDays) : undefined;
      docs.push(
        toStoredFeature({
          sourceId,
          feature: { ...feature, excluded: true },
          includeEmbedding,
          expiresAt,
        })
      );
    }
    for (const latest of restorableLatest) {
      const feature = fromStoredFeature(latest);
      const expiresAt = latest.expires_at ? computeExpiresAt(now, this.ttlDays) : undefined;
      docs.push(
        toStoredFeature({
          sourceId,
          feature: { ...feature, excluded: undefined },
          includeEmbedding,
          expiresAt,
        })
      );
    }
    for (const op of deletableOps) {
      docs.push(toTombstone(sourceId, { id: op.delete.id, type: op.delete.type }));
    }
    return docs;
  }

  async keepAlivePersistent(
    sourceId: string,
    { lastRefreshedBefore }: { lastRefreshedBefore: string }
  ): Promise<{ refreshed: number }> {
    const where = inPredicate(SOURCE_ID, [sourceId]);
    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      IS_DURABLE_OR_EXCLUDED,
      olderThan(lastRefreshedBefore)
    );
    const latest = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    if (latest.length === 0) {
      return { refreshed: 0 };
    }

    const now = new Date().toISOString();
    // Keep `expires_at` in step with the refreshed `@timestamp` if the feature is expiring
    const rollExpiresAt = (expiresAt?: string): string | undefined =>
      expiresAt ? computeExpiresAt(now, this.ttlDays) : undefined;

    await bulkCreateWithInferenceFallback(this.logger, ({ includeEmbedding }) => {
      const docs: StoredKnowledgeIndicator[] = [];
      for (const doc of latest) {
        if (isStoredFeatureKnowledgeIndicator(doc)) {
          docs.push(
            toStoredFeature({
              sourceId,
              feature: fromStoredFeature(doc),
              includeEmbedding,
              expiresAt: rollExpiresAt(doc.expires_at),
            })
          );
        } else if (isStoredQueryKnowledgeIndicator(doc)) {
          const link = fromStoredQuery(doc);
          // The stored `rule_id` is carried over on purpose: a keep-alive must never
          // recompute it, or the revision would point at a rule that does not exist.
          docs.push(
            toStoredQuery({
              space: this.space,
              sourceId,
              query: { ...link.query, rule_backed: link.rule_backed, rule_id: link.rule_id },
              includeEmbedding,
              expiresAt: rollExpiresAt(doc.expires_at),
            })
          );
        }
      }
      return this.dataStreamClient.create({
        space: this.space,
        refresh: 'wait_for',
        documents: docs as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
      });
    });

    return { refreshed: latest.length };
  }

  async deleteIndicators(sourceId: string): Promise<void> {
    const latest = await this.revisionReader.fetchLatestRevisions(
      inPredicate(SOURCE_ID, [sourceId]),
      IS_NOT_DELETED
    );
    if (latest.length === 0) {
      return;
    }
    const tombstones = latest.map((doc) => toTombstone(sourceId, doc));
    const response = await this.dataStreamClient.create({
      space: this.space,
      refresh: 'wait_for',
      documents: tombstones as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
    });
    if (response.errors) {
      // The underlying client does not throw on partial failure; without this
      // check a failed tombstone write would resolve as a successful delete.
      const { inference, other } = countRawBulkInferenceErrors(response);
      throw new Error(
        `Failed to delete indicators for source "${sourceId}": ${inference + other}/${
          tombstones.length
        } tombstone writes errored`
      );
    }
  }
}
