/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { GetInvestigationResponse, ListInvestigationsResponse } from '@kbn/pnd-common';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import { PND_INVESTIGATIONS_INDEX } from './investigation_index_bootstrap';

type Investigation = ListInvestigationsResponse['investigations'][number];

/**
 * Read/write access to the Investigation document itself (as distinct from its
 * child Proposals — see {@link ProposalDecisionStore} — or its timeline events
 * — see `InvestigationTimelineStore`).
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc).
 */
export class InvestigationRecordStore {
  constructor(private readonly bootstrap: InvestigationIndexBootstrap) {}

  public async listInvestigations(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationsResponse> {
    await this.bootstrap.ensureReady(esClient);
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
    await this.bootstrap.ensureReady(esClient);
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
    await this.bootstrap.ensureReady(esClient);
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
}
