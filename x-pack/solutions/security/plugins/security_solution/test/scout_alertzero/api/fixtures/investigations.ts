/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { ok } from './kbn';
import { AI_INDEX_KI_BACKING_INDEX, CONVERSATIONS_URL } from './constants';
import type { AlertZeroApi } from './kbn';

/**
 * Deletes an Investigation conversation; its attachments are deleted with it. A 404 means an
 * earlier teardown already removed it, anything else non-2xx fails loudly — `api.public`
 * resolves non-2xx responses as values, so discarding the result would make teardown look
 * successful while the conversation (and its pending containment cards) survived.
 */
export const deleteInvestigation = async (api: AlertZeroApi, id: string): Promise<void> => {
  const response = await api.public('DELETE', `${CONVERSATIONS_URL}/${encodeURIComponent(id)}`);
  if (response.statusCode >= 300 && response.statusCode !== 404) {
    throw new Error(
      `Delete investigation ${id} failed: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
};

/**
 * Finds the Investigation conversations this run created, by the run-owned host/user names its
 * seed data carries (see `seedAttackScenario`). The Attack Discovery review opens one
 * Investigation per discovered attack, and only the one behind the first approved proposal is
 * captured during the run; a spec that fails between two proposals — or a review that opened an
 * extra investigation on a failed fingerprint join — otherwise leaves conversations behind that
 * point at seed data the teardown removes. The list route cannot filter by content, so this
 * reads each conversation and matches its serialized fields against the run's entity names:
 * names minted per run are a precise key, and a conversation of another run (or a user's own)
 * never contains them. Public conversations only — a workflow's own Investigation is created
 * public so the gate can read it back.
 *
 * The list is newest `updated_at` first, so the scan stops at the first conversation last
 * updated before `since` (the run's start): nothing older can be this run's. That bounds the
 * per-conversation reads to the run's window instead of the space's whole history.
 */
export const discoverRunInvestigations = async (
  api: AlertZeroApi,
  entityNames: readonly string[],
  { since }: { since: Date }
): Promise<string[]> => {
  if (entityNames.length === 0) {
    return [];
  }
  const CONVERSATIONS_PAGE_SIZE = 100;
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const response = ok(
      await api.public<{
        results?: Array<{ id: string; updated_at?: string }>;
        pagination?: { total?: number };
      }>(
        'GET',
        `${CONVERSATIONS_URL}?page=${page}&per_page=${CONVERSATIONS_PAGE_SIZE}&sort_order=desc`
      ),
      `list investigations page ${page}`
    );
    const results = response.results ?? [];
    for (const conversation of results) {
      // A missing timestamp is read, not skipped: it cannot prove the conversation is older.
      if (conversation.updated_at && new Date(conversation.updated_at) < since) {
        return ids;
      }
      const detail = await api.public(
        `GET`,
        `${CONVERSATIONS_URL}/${encodeURIComponent(conversation.id)}`
      );
      // Deleted between the list and the read: nothing to discover, and not an error. Any other
      // failure would hide a run-owned Investigation from teardown, so it throws.
      if (detail.statusCode !== 404) {
        const body = ok(detail, `read investigation ${conversation.id}`);
        if (entityNames.some((name) => JSON.stringify(body).includes(name))) {
          ids.push(conversation.id);
        }
      }
    }
    const total = response.pagination?.total ?? 0;
    if (page * CONVERSATIONS_PAGE_SIZE >= total) {
      return ids;
    }
  }
};

/**
 * Removes exactly the indicators this run wrote. Matches the indicator's own `id` as well as the
 * document id: a seeded indicator is indexed under its id, but `context-engine.createKi` lets
 * Elasticsearch generate the document id and stores the indicator id only in `_source.id`.
 */
export const cleanupKnowledgeIndicators = async (
  esClient: EsClient,
  kiIds: readonly string[]
): Promise<void> => {
  if (kiIds.length === 0) {
    return;
  }
  await esClient
    .deleteByQuery({
      index: AI_INDEX_KI_BACKING_INDEX,
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          should: [{ ids: { values: [...kiIds] } }, { terms: { id: [...kiIds] } }],
          minimum_should_match: 1,
        },
      },
    })
    .catch((error: { statusCode?: number }) => {
      if (error.statusCode !== 404) {
        throw error;
      }
    });
};
