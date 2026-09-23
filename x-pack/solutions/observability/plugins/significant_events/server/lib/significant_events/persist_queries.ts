/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery, QueryLink } from '@kbn/significant-events-schema';
import {
  getFromSources,
  hasSameEsql,
  normalizeEsqlSafe,
  replaceFromSources,
} from '@kbn/streams-schema';
import { HIGH_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import { v4 } from 'uuid';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../knowledge_indicators';
import { queryFromLink } from '../knowledge_indicators/knowledge_indicator_client/serializers';
import { canQueryBeRuleBacked } from './alerting/significant_events_alerting_context';

type PersistedQuery = GeneratedSignificantEventQuery & { id: string };

export interface PersistQueriesResult {
  persistedQueries: PersistedQuery[];
  skippedQueries: GeneratedSignificantEventQuery[];
}

function isRuleEligible(query: GeneratedSignificantEventQuery): boolean {
  return (
    canQueryBeRuleBacked({ type: query.type, esql: query.esql }) &&
    query.severity_score >= HIGH_SEVERITY_THRESHOLD
  );
}

/** True when the query's FROM clause is exactly the source view. */
function readsOnlyFromView(esql: string, viewName: string): boolean {
  const sources = getFromSources(esql);
  return sources.length === 1 && sources[0] === viewName;
}

export async function persistQueries(
  sourceId: string,
  queries: GeneratedSignificantEventQuery[],
  deps: {
    kiClient: KnowledgeIndicatorClient;
    viewName: string;
  }
): Promise<PersistQueriesResult> {
  const { kiClient, viewName } = deps;

  if (queries.length === 0) {
    return { persistedQueries: [], skippedQueries: [] };
  }

  // Canonicalize FROM onto the source view so two queries that differ only by source list
  // still collide. A stored query that collides but still reads another index is rewritten
  // onto the view; skipping it would leave the rule on the pre-cutover FROM.
  const dedupKey = (esql: string) => normalizeEsqlSafe(replaceFromSources(esql, [viewName]));

  const { [sourceId]: existingLinks = [] } = await kiClient.getStreamToQueryLinksMap([sourceId]);
  const existingById = new Map(existingLinks.map((link) => [link.query.id, link]));
  const linksByDedupKey = new Map<string, QueryLink[]>();
  for (const link of existingLinks) {
    const key = dedupKey(link.query.esql.query);
    const group = linksByDedupKey.get(key);
    if (group) {
      group.push(link);
    } else {
      linksByDedupKey.set(key, [link]);
    }
  }
  const ruleBackedIds = new Set(
    existingLinks.filter((link) => link.rule_backed).map((link) => link.query.id)
  );

  const defaultExpiresAt = kiClient.getDefaultExpiresAt();

  const resolveExpiresAt = (priorId?: string): string | undefined => {
    if (!priorId) return defaultExpiresAt;
    const prior = existingById.get(priorId);
    if (!prior) return defaultExpiresAt;
    if (prior.expires_at) return defaultExpiresAt;
  };

  const standardOps: KIBulkOperation[] = [];
  const ruleEligibleQueries: PersistedQuery[] = [];
  const ruleEligibleExpiresAt = new Map<string, string | undefined>();
  const persistedQueries: PersistedQuery[] = [];
  const skippedQueries: GeneratedSignificantEventQuery[] = [];
  const seenIncomingKeys = new Set<string>();

  const queueViewRewrite = (link: QueryLink, rewritten: string): void => {
    const persisted: PersistedQuery = {
      id: link.query.id,
      type: link.query.type,
      title: link.query.title,
      description: link.query.description,
      esql: { query: rewritten },
      severity_score: link.query.severity_score ?? 0,
      features: link.query.features ?? [],
      ...(link.query.evidence ? { evidence: link.query.evidence } : {}),
    };
    const expiresAt = resolveExpiresAt(link.query.id);
    if (link.rule_backed) {
      ruleEligibleQueries.push(persisted);
      ruleEligibleExpiresAt.set(link.query.id, expiresAt);
    } else {
      standardOps.push({
        index: {
          query: { ...persisted, expires_at: expiresAt, rule_backed: false },
        },
      });
    }
    persistedQueries.push(persisted);
  };

  for (const query of queries) {
    const { replaces, ...indexFields } = query;

    const normalizedEsql = dedupKey(query.esql.query);
    const storedMatches = linksByDedupKey.get(normalizedEsql);

    if (storedMatches) {
      const firstIncoming = !seenIncomingKeys.has(normalizedEsql);
      seenIncomingKeys.add(normalizedEsql);
      let rewrote = false;
      if (firstIncoming) {
        for (const link of storedMatches) {
          const storedEsql = link.query.esql.query;
          if (readsOnlyFromView(storedEsql, viewName)) {
            continue;
          }
          const rewritten = replaceFromSources(storedEsql, [viewName]);
          if (hasSameEsql(storedEsql, rewritten)) {
            continue;
          }
          queueViewRewrite(link, rewritten);
          rewrote = true;
        }
      }
      if (!rewrote) {
        skippedQueries.push(query);
      }
      continue;
    }

    if (seenIncomingKeys.has(normalizedEsql)) {
      skippedQueries.push(query);
      continue;
    }

    seenIncomingKeys.add(normalizedEsql);

    if (replaces && existingById.has(replaces)) {
      const queryId = replaces;
      const expiresAt = resolveExpiresAt(queryId);
      if (ruleBackedIds.has(queryId)) {
        ruleEligibleQueries.push({ id: queryId, ...query });
        ruleEligibleExpiresAt.set(queryId, expiresAt);
      } else {
        standardOps.push({
          index: {
            query: { id: queryId, expires_at: expiresAt, ...indexFields, rule_backed: false },
          },
        });
      }
      persistedQueries.push({ ...query, id: queryId });
    } else {
      const id = v4();
      if (isRuleEligible(query)) {
        ruleEligibleQueries.push({ id, ...query });
        ruleEligibleExpiresAt.set(id, defaultExpiresAt);
      } else {
        standardOps.push({
          index: {
            query: { id, expires_at: defaultExpiresAt, ...indexFields, rule_backed: false },
          },
        });
      }
      persistedQueries.push({ ...query, id });
    }
  }

  if (standardOps.length > 0) {
    await kiClient.bulk(sourceId, standardOps);
  }

  if (ruleEligibleQueries.length > 0) {
    const ruleEligibleIds = new Set(ruleEligibleQueries.map((q) => q.id));
    await kiClient.replaceStreamQueries(sourceId, (currentLinks) => [
      ...currentLinks.filter((l) => !ruleEligibleIds.has(l.query.id)).map(queryFromLink),
      ...ruleEligibleQueries.map(({ replaces: _replaces, ...q }) => ({
        ...q,
        expires_at: ruleEligibleExpiresAt.get(q.id),
      })),
    ]);
  }

  return { persistedQueries, skippedQueries };
}
