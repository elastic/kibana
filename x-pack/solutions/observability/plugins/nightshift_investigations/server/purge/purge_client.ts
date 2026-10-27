/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { isResponseError } from '@kbn/es-errors';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { CORTEX_AI_INDEX_DEST } from '../../common/cortex';
import { DECISION_TREE_AI_INDEX_DEST } from '../../common/decision_trees';
import { MEMORY_INDEX } from '../../common/memory';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import {
  emptyPurgeCounts,
  MAX_PURGE_INVESTIGATIONS,
  type KnowledgePurgeCounts,
  type KnowledgePurgeInvestigation,
  type KnowledgePurgePreview,
  type KnowledgePurgeResult,
  type KnowledgePurgeScope,
} from '../../common/purge';

const SPACE_ID_FIELD = 'attributes.space_id';

/**
 * Removes everything the investigator learned after a point in time, for one space. Use it after
 * a suspected prompt-injection run: the poisoned memory pages, Cortex pages, decision-tree
 * versions and investigation conversations all carry a write timestamp, so a cutoff drops the
 * whole blast radius without touching knowledge that predates the attack.
 *
 * This is not a secure erase — Elasticsearch does not guarantee the bytes leave existing segments
 * or snapshots.
 */
export interface KnowledgePurgeClient {
  preview: (since: string) => Promise<KnowledgePurgePreview>;
  purge: (since: string) => Promise<KnowledgePurgeResult>;
}

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) &&
  typeof error.body.error === 'object' &&
  error.body.error.type === 'index_not_found_exception';

/** Every store writes `@timestamp` on each write, so "touched since" is the same query everywhere. */
const writtenSince = (spaceId: string, since: string): QueryDslQueryContainer => ({
  bool: {
    filter: [{ term: { [SPACE_ID_FIELD]: spaceId } }, { range: { '@timestamp': { gte: since } } }],
  },
});

export const createKnowledgePurgeClient = ({
  esClient,
  logger,
  spaceId,
  getConversations,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  /** Undefined when Agent Builder is unavailable; investigations are then left alone. */
  getConversations: () => Promise<ConversationPublicClient | undefined>;
  signal?: AbortSignal;
}): KnowledgePurgeClient => {
  const countIndex = async (index: string, since: string): Promise<number> => {
    try {
      const { count } = await esClient.count(
        { index, query: writtenSince(spaceId, since) },
        { signal }
      );
      return count;
    } catch (error) {
      if (isIndexNotFound(error)) return 0;
      throw error;
    }
  };

  const deleteIndex = async (index: string, since: string): Promise<number> => {
    try {
      const { deleted } = await esClient.deleteByQuery(
        { index, query: writtenSince(spaceId, since), refresh: true, conflicts: 'proceed' },
        { signal }
      );
      return deleted ?? 0;
    } catch (error) {
      if (isIndexNotFound(error)) return 0;
      throw error;
    }
  };

  /** Investigation conversations the caller can see whose last write is at or after the cutoff. */
  const findInvestigations = async (
    since: string
  ): Promise<{ investigations: KnowledgePurgeInvestigation[]; capped: boolean }> => {
    const conversations = await getConversations();
    if (!conversations) {
      logger.debug('Agent Builder is not available — purge leaves investigations alone');
      return { investigations: [], capped: false };
    }
    const cutoff = Date.parse(since);
    const { results } = await conversations.list({
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      perPage: MAX_PURGE_INVESTIGATIONS + 1,
    });
    const matching = results
      .filter(({ updated_at: updatedAt }) => Date.parse(updatedAt) >= cutoff)
      .map(({ id, title, updated_at: updatedAt }) => ({ id, title, updated_at: updatedAt }));

    return {
      investigations: matching.slice(0, MAX_PURGE_INVESTIGATIONS),
      capped: matching.length > MAX_PURGE_INVESTIGATIONS,
    };
  };

  const deleteInvestigations = async (since: string): Promise<number> => {
    const conversations = await getConversations();
    if (!conversations) return 0;
    const { investigations } = await findInvestigations(since);
    let deleted = 0;
    for (const { id } of investigations) {
      if (await conversations.delete(id)) {
        deleted++;
      }
    }
    return deleted;
  };

  return {
    async preview(since) {
      const { investigations, capped } = await findInvestigations(since);
      const [memoryPages, cortexPages, decisionTrees] = await Promise.all([
        countIndex(MEMORY_INDEX, since),
        countIndex(CORTEX_AI_INDEX_DEST, since),
        countIndex(DECISION_TREE_AI_INDEX_DEST, since),
      ]);

      return {
        since,
        counts: {
          memory_pages: memoryPages,
          cortex_pages: cortexPages,
          decision_trees: decisionTrees,
          investigations: investigations.length,
        },
        investigations,
        investigations_capped: capped,
      };
    },

    async purge(since) {
      const deleted: KnowledgePurgeCounts = emptyPurgeCounts();
      const failures: KnowledgePurgeResult['failures'] = [];

      /** One failing store must not keep the others poisoned, so each scope is isolated. */
      const run = async (scope: KnowledgePurgeScope, purgeScope: () => Promise<number>) => {
        try {
          deleted[scope] = await purgeScope();
        } catch (error) {
          failures.push({ scope, message: (error as Error).message });
          logger.error(`Nightshift purge failed for ${scope}: ${(error as Error).message}`);
        }
      };

      await run('memory_pages', () => deleteIndex(MEMORY_INDEX, since));
      await run('cortex_pages', () => deleteIndex(CORTEX_AI_INDEX_DEST, since));
      await run('decision_trees', () => deleteIndex(DECISION_TREE_AI_INDEX_DEST, since));
      await run('investigations', () => deleteInvestigations(since));

      logger.info(
        `Nightshift knowledge purge space=${spaceId} since=${since} ` +
          `memory=${deleted.memory_pages} cortex=${deleted.cortex_pages} ` +
          `trees=${deleted.decision_trees} investigations=${deleted.investigations} ` +
          `failures=${failures.length}`
      );

      return { since, deleted, failures };
    },
  };
};
