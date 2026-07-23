/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
} from '@kbn/pnd-common';
import { realInvestigations, realProposals } from '../../routes/investigations/real_data';
import type {
  Proposal as CanonicalProposal,
  EvidencePackage,
  WorkerEvaluationRecord,
} from '../../common/schemas';

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
export type ProposalStatusUpdate =
  | { status: 'approved' }
  | { status: 'dismissed'; rejectionReason?: string }
  | { status: 'modified'; analystReasoning: string };

interface ProposalDoc extends Proposal {
  investigationId: string;
  rejectionReason?: string;
  analystReasoning?: string;
}

/**
 * Elasticsearch-backed store for PND investigations and their proposals.
 *
 * Investigations are read-only Watch output; proposals carry mutable analyst
 * decision state (accept / reject / modify). On first start the store creates
 * both indices and seeds them from the bundled demo data if they are empty, so
 * the app reads real, persisted documents rather than in-memory constants.
 */
export class InvestigationStore {
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
    await this.ensureIndex(esClient, PND_INVESTIGATIONS_INDEX);
    await this.ensureIndex(esClient, PND_PROPOSALS_INDEX);
    await this.ensureIndex(esClient, PND_EVIDENCE_INDEX);
    await this.ensureIndex(esClient, PND_WORKER_EVAL_INDEX);
    await this.ensureIndex(esClient, PND_CANONICAL_PROPOSALS_INDEX);
    await this.seedIfEmpty(esClient);
  }

  private async ensureIndex(esClient: ElasticsearchClient, index: string): Promise<void> {
    const exists = await esClient.indices.exists({ index });
    if (exists) {
      return;
    }
    await esClient.indices.create({
      index,
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      // Dynamic mapping is sufficient for the demo document shapes; the id
      // fields we filter/sort on are keywords by default for the ids we use.
      mappings: { dynamic: true },
    });
    this.logger.info(`PND: created index ${index}`);
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
      sort: [{ priorityScore: { order: 'desc', unmapped_type: 'long' } }],
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

  public async listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse> {
    await this.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 1000,
      query: { term: { 'investigationId.keyword': investigationId } },
    });
    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal);
    return { proposals, total: proposals.length };
  }

  /**
   * Apply an analyst decision to a proposal document. Returns the updated
   * status, or null when the proposal does not exist.
   */
  public async updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate
  ): Promise<ProposalStatusUpdate | null> {
    await this.ensureReady(esClient);
    const doc: Record<string, unknown> = { status: update.status };
    if (update.status === 'dismissed' && update.rejectionReason != null) {
      doc.rejectionReason = update.rejectionReason;
    }
    if (update.status === 'modified') {
      doc.analystReasoning = update.analystReasoning;
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
   * Persist a canonical Daybreak Proposal produced by a Watch Worker run.
   * Overwrites by id so a re-run is idempotent.
   */
  public async saveProposal(
    esClient: ElasticsearchClient,
    proposal: CanonicalProposal
  ): Promise<void> {
    await this.ensureReady(esClient);
    await esClient.index({
      index: PND_CANONICAL_PROPOSALS_INDEX,
      id: proposal.id,
      document: proposal,
      refresh: true,
    });
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
}
