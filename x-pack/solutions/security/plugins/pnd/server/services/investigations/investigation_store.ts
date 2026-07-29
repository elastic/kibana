/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  TimelineEvent,
} from '@kbn/pnd-common';
import {
  canonicalProposalsMapping,
  evidenceMapping,
  investigationsMapping,
  MAPPINGS_VERSION,
  proposalsMapping,
  workerEvaluationsMapping,
} from './mappings';

import { realInvestigations, realProposals } from '../../routes/investigations/real_data';
import type {
  Proposal as CanonicalProposal,
  EvidencePackage,
  WorkerEvaluationRecord,
} from '../../common/schemas';
import type { DetectionChangeSignal } from '../../common/schemas/detection_change';
import type { PndStore } from './pnd_store';
import type { WatchActivityMetrics } from './pnd_store';
import { canonicalProposalToUiProposalDoc } from './template_mapping';

type Investigation = ListInvestigationsResponse['investigations'][number];
type Proposal = ListInvestigationProposalsResponse['proposals'][number];

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
 * Terminal + intermediate proposal states an analyst decision can move a
 * proposal into. Persisted on the proposal document in ES.
 */
export type DismissalReason =
  | 'wrong'
  | 'duplicate'
  | 'insufficient_evidence'
  | 'low_value'
  | 'out_of_scope'
  | 'already_handled'
  | 'other';

export type ProposalStatusUpdate =
  | { status: 'approved' }
  | { status: 'dismissed'; rejectionReason?: string; dismissalReason?: DismissalReason }
  | { status: 'modified'; analystReasoning: string }
  | { status: 'escalated'; caseRef?: string }
  | { status: 'deferred'; sla?: string }
  | { status: 'pending'; assignee: string | null };

interface ProposalDoc extends Proposal {
  investigationId: string;
  rejectionReason?: string;
  dismissalReason?: DismissalReason;
  analystReasoning?: string;
  caseRef?: string;
}

/**
 * Elasticsearch-backed store for PND investigations and their proposals.
 *
 * Investigations are read-only Watch output; proposals carry mutable analyst
 * decision state (accept / reject / modify). On first start the store creates
 * both indices and seeds them from the bundled demo data if they are empty, so
 * the app reads real, persisted documents rather than in-memory constants.
 */
export class InvestigationStore implements PndStore {
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

  public async listInvestigations(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationsResponse> {
    await this.ensureReady(esClient);
    const result = await esClient.search<Investigation>({
      index: PND_INVESTIGATIONS_INDEX,
      size: 1000,
      query: { match_all: {} },
      // `priorityScore` is mapped as `integer`, so no `unmapped_type` fallback
      // is needed. Investigations without a score sort last.
      sort: [{ priorityScore: { order: 'desc', missing: '_last' } }],
    });
    const investigations = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is Investigation => src != null);
    return { investigations, total: investigations.length };
  }

  public async getInvestigation(
    esClient: ElasticsearchClient,
    id: string
  ): Promise<GetInvestigationResponse['investigation'] | null> {
    await this.ensureReady(esClient);
    try {
      const result = await esClient.get<Investigation>({
        index: PND_INVESTIGATIONS_INDEX,
        id,
      });
      return result._source ?? null;
    } catch (error) {
      if (error?.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new Investigation document if `id` doesn't already exist.
   * Idempotent by design: a Watch orchestrator may run this on every alert
   * touch, so a create-if-missing (rather than blind index/overwrite) means
   * a re-triggered run against the same alert doesn't clobber analyst edits
   * (assignee, status, priorityScore) made since the Investigation opened.
   */
  public async createInvestigationIfMissing(
    esClient: ElasticsearchClient,
    investigation: Investigation
  ): Promise<void> {
    await this.ensureReady(esClient);
    try {
      await esClient.create({
        index: PND_INVESTIGATIONS_INDEX,
        id: investigation.id,
        document: investigation,
        refresh: true,
      });
    } catch (error) {
      // 409 = version conflict = document already exists. That's the
      // expected/common path once an Investigation has been opened once;
      // treat it as success rather than surfacing to the caller.
      if (error?.meta?.statusCode === 409) {
        return;
      }
      throw error;
    }
  }

  public async listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse> {
    await this.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 1000,
      // `investigationId` is now mapped as `keyword`, so it is filtered directly.
      // The previous `investigationId.keyword` path only existed because dynamic
      // mapping made the field `text` with a `.keyword` subfield.
      query: { term: { investigationId } },
    });

    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal);
    return { proposals, total: proposals.length };
  }

  /**
   * List ALL proposals across ALL investigations for the Brief queue.
   * Sorted: pending-first (pending has no numeric sort key in ES, so sort in
   * application code), then by confidence descending.
   */
  public async listAllProposals(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationProposalsResponse> {
    await this.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 1000,
      query: { match_all: {} },
    });

    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal)
      .sort((a, b) => {
        // Pending proposals first (they need analyst attention).
        const aPending = a.status === 'pending' ? 0 : 1;
        const bPending = b.status === 'pending' ? 0 : 1;
        if (aPending !== bPending) {
          return aPending - bPending;
        }
        // Then by confidence descending.
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });

    return { proposals, total: proposals.length };
  }

  /**
   * Apply an analyst decision to a proposal document. Returns the updated
   * status, or null when the proposal does not exist.
   */
  public async updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate,
    _request?: KibanaRequest
  ): Promise<ProposalStatusUpdate | null> {
    await this.ensureReady(esClient);
    const doc: Record<string, unknown> = { status: update.status };
    if (update.status === 'dismissed') {
      if (update.rejectionReason != null) doc.rejectionReason = update.rejectionReason;
      if (update.dismissalReason != null) doc.dismissalReason = update.dismissalReason;
    }
    if (update.status === 'modified') {
      doc.analystReasoning = update.analystReasoning;
    }
    if (update.status === 'escalated' && update.caseRef != null) {
      doc.caseRef = update.caseRef;
    }
    if (update.status === 'deferred' && update.sla != null) {
      doc.sla = update.sla;
    }
    if (update.status === 'pending') {
      doc.assignee = update.assignee;
    }

    try {
      await esClient.update({
        index: PND_PROPOSALS_INDEX,
        id: proposalId,
        doc,
        refresh: true,
      });
      return update;
    } catch (error) {
      if (error?.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Recompute the parent Investigation's decision-facing fields after one of its
   * proposals changed status.
   *
   * Why this exists: `updateProposalStatus` writes the proposal document only.
   * The Brief queue card, however, renders investigation-level fields
   * (`pendingProposalCount`, and via it the primary CTA). Without this
   * reconciliation the queue keeps advertising a pre-decision action — "Isolate
   * endpoint" — for an investigation whose only proposal already reads
   * "Escalated", i.e. the list and the detail page disagree about the same
   * record.
   *
   * `pendingProposalCount` is recounted from the proposal index rather than
   * decremented, so a re-run or an out-of-order decision converges on the
   * truth instead of drifting.
   *
   * Best-effort by design: the analyst's decision is already durably recorded
   * on the proposal document, so a failure to refresh the parent's denormalised
   * counters must not fail the decision request.
   */
  public async reconcileInvestigationAfterDecision(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<void> {
    await this.ensureReady(esClient);
    try {
      const pending = await esClient.count({
        index: PND_PROPOSALS_INDEX,
        query: {
          bool: {
            filter: [{ term: { investigationId } }, { term: { status: 'pending' } }],
          },
        },
      });

      await esClient.update({
        index: PND_INVESTIGATIONS_INDEX,
        id: investigationId,
        doc: {
          pendingProposalCount: pending.count,
          updatedAt: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (error) {
      if (error?.meta?.statusCode === 404) {
        return;
      }
      throw error;
    }
  }

  /**
   * Persist a canonical Daybreak Proposal produced by a Watch Worker run.
   * Overwrites by id so a re-run is idempotent.
   */
  public async saveProposal(
    esClient: ElasticsearchClient,
    proposal: CanonicalProposal,
    _request?: KibanaRequest
  ): Promise<void> {
    await this.ensureReady(esClient);
    await esClient.index({
      index: PND_CANONICAL_PROPOSALS_INDEX,
      id: proposal.id,
      document: proposal,
      refresh: true,
    });

    // Also project into the UI-facing index the Investigations UI's Proposals
    // tab actually reads (listProposals queries PND_PROPOSALS_INDEX, not
    // PND_CANONICAL_PROPOSALS_INDEX — two different schemas for two
    // different consumers, see canonicalProposalToUiProposalDoc's doc
    // comment). Best-effort: a failure here must not fail the canonical
    // write, which is the source of truth for eval/scoring.
    try {
      await esClient.index({
        index: PND_PROPOSALS_INDEX,
        id: proposal.id,
        // Denormalised investigationId copy so listProposals' term-query
        // works without a join, mirroring the seedIfEmpty bulk convention;
        // stripped in listProposals before the doc reaches the API.
        document: {
          ...canonicalProposalToUiProposalDoc(proposal),
          investigationId: proposal.investigationId,
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(
        `PND: saveProposal UI-projection write failed for ${proposal.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /** Persist a canonical EvidencePackage produced by a Watch Worker run. */
  public async saveEvidencePackage(
    esClient: ElasticsearchClient,
    evidence: EvidencePackage
  ): Promise<void> {
    await this.ensureReady(esClient);
    await esClient.index({
      index: PND_EVIDENCE_INDEX,
      id: evidence.id,
      document: evidence,
      refresh: true,
    });
  }

  /**
   * Persist exactly one WorkerEvaluationRecord per Worker run. This is the
   * canonical record the Evaluation & Trust scorers read (no parallel store).
   */
  public async saveWorkerEvaluationRecord(
    esClient: ElasticsearchClient,
    record: WorkerEvaluationRecord
  ): Promise<void> {
    await this.ensureReady(esClient);
    await esClient.index({
      index: PND_WORKER_EVAL_INDEX,
      id: record.id,
      document: record,
      refresh: true,
    });
  }

  /**
   * Append an escalation-lineage entry to an investigation so the UI can render
   * the Floor -> Dark -> Deep provenance chain. Fail-soft: a missing
   * investigation is logged, not thrown (the orchestrator step is continue-on-
   * failure).
   */
  public async recordEscalation(
    esClient: ElasticsearchClient,
    args: { investigationId: string; sourceWatch: string; escalatedToWatch: string }
  ): Promise<void> {
    await this.ensureReady(esClient);
    const entry = {
      sourceWatch: args.sourceWatch,
      escalatedToWatch: args.escalatedToWatch,
      at: new Date().toISOString(),
    };
    try {
      await esClient.update({
        index: PND_INVESTIGATIONS_INDEX,
        id: args.investigationId,
        script: {
          source:
            'if (ctx._source.escalationLineage == null) { ctx._source.escalationLineage = [] } ctx._source.escalationLineage.add(params.entry)',
          params: { entry },
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(
        `PND: could not record escalation lineage for ${args.investigationId}: ${error?.message}`
      );
    }
  }

  /**
   * Wire a completed Deep Watch worker run back into the investigation:
   * append the worker's forensic timeline events, flip the investigation
   * status to `deep-watch-complete`, and (optionally) overwrite the summary
   * with the worker verdict. Idempotent per event id — re-running the worker
   * will not duplicate events that were already appended.
   */
  public async recordDeepWatchOutcome(
    esClient: ElasticsearchClient,
    args: {
      investigationId: string;
      events: TimelineEvent[];
      status?: string;
      summary?: string | null;
    }
  ): Promise<void> {
    await this.ensureReady(esClient);
    try {
      await esClient.update({
        index: PND_INVESTIGATIONS_INDEX,
        id: args.investigationId,
        script: {
          source: `
            if (ctx._source.events == null) { ctx._source.events = [] }
            for (evt in params.events) {
              boolean exists = false;
              for (existing in ctx._source.events) {
                if (existing.id == evt.id) { exists = true; break; }
              }
              if (!exists) { ctx._source.events.add(evt); }
            }
            if (params.status != null) { ctx._source.status = params.status; }
            if (params.summary != null) { ctx._source.summary = params.summary; }
          `,
          params: {
            events: args.events,
            status: args.status ?? null,
            summary: args.summary ?? null,
          },
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(
        `PND: could not record Deep Watch outcome for ${args.investigationId}: ${error?.message}`
      );
    }
  }

  /**
   * Attach a Detection Change Signal to an Investigation (delta #1/#2). Idempotently appends a
   * `detection-change` timeline event and persists the structured signal onto the investigation
   * doc's `detectionChangeSignals` array so Detection Watch can consume it. The producing worker
   * never creates or tunes rules — it only surfaces the gap.
   */
  public async recordDetectionChangeSignal(
    esClient: ElasticsearchClient,
    args: {
      investigationId: string;
      signal: DetectionChangeSignal;
      event: TimelineEvent;
    }
  ): Promise<void> {
    await this.ensureReady(esClient);
    try {
      await esClient.update({
        index: PND_INVESTIGATIONS_INDEX,
        id: args.investigationId,
        script: {
          source: `
            if (ctx._source.events == null) { ctx._source.events = [] }
            boolean evtExists = false;
            for (existing in ctx._source.events) {
              if (existing.id == params.event.id) { evtExists = true; break; }
            }
            if (!evtExists) { ctx._source.events.add(params.event); }
            if (ctx._source.detectionChangeSignals == null) { ctx._source.detectionChangeSignals = [] }
            boolean sigExists = false;
            for (existing in ctx._source.detectionChangeSignals) {
              if (existing.runId == params.signal.runId) { sigExists = true; break; }
            }
            if (!sigExists) { ctx._source.detectionChangeSignals.add(params.signal); }
          `,
          params: {
            event: args.event,
            signal: args.signal,
          },
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(
        `PND: could not record detection-change signal for ${args.investigationId}: ${error?.message}`
      );
    }
  }

  /**
   * Real per-watch activity metrics derived from Investigation/Proposal
   * documents. Two batched aggs queries (never N+1 per watch):
   *  - `runs7d` + `lastRun`: investigation count/max(createdAt) by `watch_id`
   *    over the last 7 days.
   *  - `acceptedPct`: proposal decision ratio by `sourceWatchId`. "Accepted"
   *    = approved or executed; "decided" excludes `pending` (not yet
   *    decided) and `escalated`/`deferred` (handed off, not accept/reject).
   *    Ratio is null when a watch has zero decided proposals rather than
   *    reporting a misleading 0%.
   */
  public async getWatchActivityMetrics(
    esClient: ElasticsearchClient,
    watchIds: string[]
  ): Promise<Record<string, WatchActivityMetrics>> {
    await this.ensureReady(esClient);

    const result: Record<string, WatchActivityMetrics> = {};
    for (const watchId of watchIds) {
      result[watchId] = { runs7d: null, acceptedPct: null, lastRun: null };
    }
    if (watchIds.length === 0) {
      return result;
    }

    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [investigationsAgg, proposalsAgg] = await Promise.all([
      esClient.search({
        index: PND_INVESTIGATIONS_INDEX,
        size: 0,
        query: { terms: { watch_id: watchIds } },
        aggs: {
          by_watch: {
            terms: { field: 'watch_id', size: watchIds.length },
            aggs: {
              last_run: { max: { field: 'createdAt' } },
              runs_7d: { filter: { range: { createdAt: { gte: sevenDaysAgoIso } } } },
            },
          },
        },
      }),
      esClient.search({
        index: PND_PROPOSALS_INDEX,
        size: 0,
        query: { terms: { sourceWatchId: watchIds } },
        aggs: {
          by_watch: {
            terms: { field: 'sourceWatchId', size: watchIds.length },
            aggs: {
              by_status: { terms: { field: 'status', size: 10 } },
            },
          },
        },
      }),
    ]);

    interface WatchBucket {
      key: string;
      last_run: { value_as_string?: string | null };
      runs_7d: { doc_count: number };
    }
    const investigationBuckets =
      (investigationsAgg.aggregations?.by_watch as { buckets?: WatchBucket[] } | undefined)
        ?.buckets ?? [];
    for (const bucket of investigationBuckets) {
      if (!(bucket.key in result)) continue;
      result[bucket.key].runs7d = bucket.runs_7d.doc_count;
      result[bucket.key].lastRun = bucket.last_run.value_as_string ?? null;
    }

    interface StatusBucket {
      key: string;
      doc_count: number;
    }
    interface ProposalWatchBucket {
      key: string;
      by_status: { buckets?: StatusBucket[] };
    }
    const proposalBuckets =
      (proposalsAgg.aggregations?.by_watch as { buckets?: ProposalWatchBucket[] } | undefined)
        ?.buckets ?? [];
    const ACCEPTED_STATUSES = new Set(['approved', 'executed']);
    const REJECTED_STATUSES = new Set(['dismissed']);
    for (const bucket of proposalBuckets) {
      if (!(bucket.key in result)) continue;
      let accepted = 0;
      let decided = 0;
      for (const statusBucket of bucket.by_status.buckets ?? []) {
        if (ACCEPTED_STATUSES.has(statusBucket.key)) {
          accepted += statusBucket.doc_count;
          decided += statusBucket.doc_count;
        } else if (REJECTED_STATUSES.has(statusBucket.key)) {
          decided += statusBucket.doc_count;
        }
      }
      result[bucket.key].acceptedPct = decided > 0 ? Math.round((accepted / decided) * 100) : null;
    }

    return result;
  }
}
