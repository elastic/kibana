/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Incident, TimelineEvent } from '@kbn/pnd-common';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import type { InvestigationRecordStore } from './investigation_record_store';
import type { InvestigationTimelineStore } from './investigation_timeline_store';

/** Dedicated index for forked Incident roots. */
export const PND_INCIDENTS_INDEX = '.pnd-incidents' as const;

export interface ForkIncidentArgs {
  /** Investigation being promoted. */
  investigationId: string;
  /** Optional explicit id for the new Incident root; generated when absent. */
  incidentId?: string;
  /** Who promoted it (analyst id, or an orchestrator service account). */
  actor?: string;
  /** Free-text justification recorded on both roots' timelines. */
  reason?: string;
}

export type ForkIncidentResult =
  | { outcome: 'forked'; incident: Incident }
  | { outcome: 'investigation_not_found' }
  | { outcome: 'already_forked'; incident: Incident };

/**
 * Promotes an Investigation to an Incident by **forking to a new root**.
 *
 * Per the locked NotDaybreak object model (`daybreak-watches-object-model.md`,
 * PR elastic/project-daybreak#46, decision D13 "Incident in October MVP"):
 *
 *   > **Incident** | `incident` | **Fork** from Investigation to a **new root**;
 *   > prior threads carried over. **Not a status rename.**
 *
 * That "not a status rename" clause is the whole point and the reason this is a
 * separate store rather than a `status: 'incident'` field write: the source
 * Investigation survives intact as its own record, and the Incident is a new
 * root document carrying the prior timeline forward. An analyst opening either
 * one still sees the full history.
 *
 * Lineage is `Incident.forkedFromInvestigationId` (queryable in both
 * directions: forward from the fork event recorded on the Investigation's
 * timeline, backward via this field).
 *
 * NOT covered here, deliberately — these are open questions in the object-model
 * doc's "Still open" section, not oversights:
 *  - *Who* may promote (analyst-default vs. autonomy-dial auto-promotion) is
 *    undecided; this store records whichever `actor` the caller supplies rather
 *    than encoding a policy.
 *  - Whether cross-conversation artifacts are **referenced or copied** when an
 *    Incident carries investigation evidence is an open Andrew+Braxton action
 *    item. This implementation carries the *timeline* over (the part the model
 *    doc does lock: "prior threads carried over") and references the source
 *    Investigation by id for everything else, which is the non-lossy option
 *    under either eventual resolution.
 */
export class IncidentForkStore {
  constructor(
    private readonly bootstrap: InvestigationIndexBootstrap,
    private readonly investigations: InvestigationRecordStore,
    private readonly timeline: InvestigationTimelineStore
  ) {}

  private async ensureIncidentIndex(esClient: ElasticsearchClient): Promise<void> {
    const exists = await esClient.indices.exists({ index: PND_INCIDENTS_INDEX });
    if (exists) return;
    try {
      await esClient.indices.create({
        index: PND_INCIDENTS_INDEX,
        mappings: {
          // `dynamic: false` (not `strict`): the Incident shape is still
          // settling upstream, and a strict mapping would hard-reject a
          // forward-compatible field rather than just leaving it unindexed.
          dynamic: false,
          properties: {
            id: { type: 'keyword' },
            template_id: { type: 'keyword' },
            template_version: { type: 'keyword' },
            forkedFromInvestigationId: { type: 'keyword' },
            watch_id: { type: 'keyword' },
            status: { type: 'keyword' },
            severity: { type: 'keyword' },
            assignee: { type: 'keyword' },
          },
        },
      });
    } catch (error) {
      // 400 resource_already_exists_exception = another request won the race.
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') return;
      throw error;
    }
  }

  /** Returns the existing Incident forked from this Investigation, if any. */
  public async findIncidentForInvestigation(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<Incident | null> {
    await this.ensureIncidentIndex(esClient);
    const result = await esClient.search<Incident>({
      index: PND_INCIDENTS_INDEX,
      size: 1,
      query: { term: { forkedFromInvestigationId: investigationId } },
    });
    return result.hits.hits[0]?._source ?? null;
  }

  public async getIncident(esClient: ElasticsearchClient, id: string): Promise<Incident | null> {
    await this.ensureIncidentIndex(esClient);
    try {
      const result = await esClient.get<Incident>({ index: PND_INCIDENTS_INDEX, id });
      return result._source ?? null;
    } catch (error) {
      if (error?.meta?.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * Forks an Investigation into a new Incident root.
   *
   * Idempotent: a second promote of the same Investigation returns the
   * already-created Incident (`outcome: 'already_forked'`) rather than opening
   * a duplicate root. A Watch orchestrator may re-evaluate the same
   * Investigation more than once, and the model doc's queue semantics assume
   * one Incident per promoted Investigation.
   */
  public async forkToIncident(
    esClient: ElasticsearchClient,
    args: ForkIncidentArgs
  ): Promise<ForkIncidentResult> {
    const { investigationId, incidentId, actor, reason } = args;
    await this.bootstrap.ensureReady(esClient);
    await this.ensureIncidentIndex(esClient);

    const investigation = await this.investigations.getInvestigation(esClient, investigationId);
    if (investigation == null) {
      return { outcome: 'investigation_not_found' };
    }

    const existing = await this.findIncidentForInvestigation(esClient, investigationId);
    if (existing != null) {
      return { outcome: 'already_forked', incident: existing };
    }

    const now = new Date().toISOString();
    const newIncidentId = incidentId ?? `incident-${investigationId}`;

    // "Prior threads carried over" — the source Investigation's timeline is
    // copied onto the Incident root, then the fork itself is appended as the
    // newest event so the promotion is visible in the Incident's own history.
    const carriedEvents: TimelineEvent[] = [...(investigation.events ?? [])];
    const forkEvent: TimelineEvent = {
      id: `evt-fork-${newIncidentId}`,
      timestamp: now,
      type: 'decision',
      summary:
        `Investigation ${investigationId} promoted to Incident ${newIncidentId}` +
        (reason ? `: ${reason}` : ''),
      actor: actor ?? 'analyst',
    };

    const incident: Incident = {
      id: newIncidentId,
      template_id: 'incident',
      forkedFromInvestigationId: investigationId,
      ...(investigation.watch_id ? { watch_id: investigation.watch_id } : {}),
      status: 'open',
      ...(investigation.severity ? { severity: investigation.severity } : {}),
      assignee: investigation.assignee ?? null,
      events: [...carriedEvents, forkEvent],
    };

    try {
      await esClient.create({
        index: PND_INCIDENTS_INDEX,
        id: newIncidentId,
        document: incident,
        refresh: true,
      });
    } catch (error) {
      // 409 = another request forked concurrently; return theirs, don't duplicate.
      if (error?.meta?.statusCode === 409) {
        const raced = await this.getIncident(esClient, newIncidentId);
        if (raced != null) return { outcome: 'already_forked', incident: raced };
      }
      throw error;
    }

    // Record the promotion on the SOURCE Investigation too, so the lineage is
    // discoverable forward (Investigation -> Incident) and not only backward
    // via forkedFromInvestigationId.
    await this.timeline.recordDeepWatchOutcome(esClient, {
      investigationId,
      events: [forkEvent],
    });

    return { outcome: 'forked', incident };
  }
}

/** Re-exported for the investigations index bootstrap's awareness. */
export type { Incident };
