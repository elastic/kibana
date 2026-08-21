/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TimelineEvent } from '@kbn/pnd-common';
import type { DetectionChangeSignal } from '../../common/schemas/detection_change';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import { PND_INVESTIGATIONS_INDEX } from './investigation_index_bootstrap';

/**
 * Appends Watch-produced events onto an Investigation's timeline: escalation
 * lineage, Deep Watch forensic outcomes, and Detection Change Signals.
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc). All three methods share the same
 * fail-soft contract: a missing/errored investigation is logged, not thrown,
 * because the calling orchestrator steps are continue-on-failure.
 */
export class InvestigationTimelineStore {
  constructor(
    private readonly bootstrap: InvestigationIndexBootstrap,
    private readonly logger: Logger
  ) {}

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
    await this.bootstrap.ensureReady(esClient);
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
    await this.bootstrap.ensureReady(esClient);
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
    await this.bootstrap.ensureReady(esClient);
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
}
