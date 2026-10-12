/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getAlertEntities } from '../../../../workflows/step_types/get_alert_entities_step/get_alert_entities';
import {
  RELATIONSHIP_KINDS,
  fetchEntityDocsById,
  fetchResolutionGroupDocs,
  nameFromEuid,
  typeFromEuid,
} from './entity_docs';
import type { EntityDoc, RelationshipKind } from './entity_docs';
import type { ClusterEdge } from './types';

const MAX_ENTITIES_PER_DISCOVERY = 50;
const MAX_ALERT_IDS_PER_DISCOVERY = 1000;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Resolution-aware identity index (investigation 10 §3). Every euid is collapsed to its golden
 * euid, and the aliases' relationship sets are unioned onto the golden node.
 *
 * Two queries per `ensure` call regardless of the number of entities: docs by `entity.id`, then
 * the alias docs (`resolved_to`) of every golden plus any golden doc not fetched yet. A failure
 * propagates; an entity that is simply absent from the store resolves to itself.
 */
export class ResolutionIndex {
  private readonly docs = new Map<string, EntityDoc>();
  private readonly goldenOf = new Map<string, string>();
  private readonly aliasSets = new Map<string, Set<string>>();
  private readonly requested = new Set<string>();
  private readonly groupFetched = new Set<string>();

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly spaceId: string,
    private readonly signal?: AbortSignal
  ) {}

  private ingest(doc: EntityDoc): void {
    this.docs.set(doc.euid, doc);
    if (doc.resolvedTo && doc.resolvedTo !== doc.euid) {
      this.goldenOf.set(doc.euid, doc.resolvedTo);
      const set = this.aliasSets.get(doc.resolvedTo) ?? new Set<string>();
      set.add(doc.euid);
      this.aliasSets.set(doc.resolvedTo, set);
    } else {
      this.goldenOf.set(doc.euid, doc.euid);
    }
  }

  private queue: Promise<void> = Promise.resolve();

  /**
   * Resolves the given euids. Calls are serialised, so concurrent callers never observe ids that
   * are marked as requested but whose documents have not been ingested yet.
   */
  public ensure(euids: string[]): Promise<void> {
    const run = this.queue.then(() => this.ensureNow(euids));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async ensureNow(euids: string[]): Promise<void> {
    const fresh = [...new Set(euids)].filter((euid) => !this.requested.has(euid)).sort(compare);
    if (fresh.length === 0) {
      return;
    }
    fresh.forEach((euid) => this.requested.add(euid));
    try {
      await this.load(fresh);
    } catch (error) {
      // Not resolved: let a later call retry instead of treating the ids as known.
      fresh.forEach((euid) => this.requested.delete(euid));
      throw error;
    }
  }

  private async load(fresh: string[]): Promise<void> {
    const docs = await fetchEntityDocsById(this.esClient, this.spaceId, fresh, this.signal);
    docs.forEach((doc) => this.ingest(doc));

    const goldens = fresh.map((euid) => this.golden(euid)).filter((g) => !this.groupFetched.has(g));
    const missingGoldenDocs = goldens.filter((g) => !this.docs.has(g));
    const group = await fetchResolutionGroupDocs(
      this.esClient,
      this.spaceId,
      goldens,
      missingGoldenDocs,
      this.signal
    );
    group.forEach((doc) => {
      this.requested.add(doc.euid);
      this.ingest(doc);
    });
    goldens.forEach((g) => this.groupFetched.add(g));
  }

  public golden(euid: string): string {
    return this.goldenOf.get(euid) ?? euid;
  }

  public aliasesOf(golden: string): string[] {
    return [...(this.aliasSets.get(golden) ?? [])].sort(compare);
  }

  /** The golden euid plus its aliases. */
  public groupOf(golden: string): string[] {
    return [golden, ...this.aliasesOf(golden)];
  }

  public doc(euid: string): EntityDoc | undefined {
    return this.docs.get(euid);
  }

  public name(euid: string): string {
    return this.docs.get(euid)?.name ?? nameFromEuid(euid);
  }

  public type(euid: string) {
    return this.docs.get(euid)?.type ?? typeFromEuid(euid);
  }

  /** Relationship targets of a golden entity: its own plus all aliases', as golden euids. */
  public relationshipTargets(golden: string): Map<RelationshipKind, string[]> {
    const result = new Map<RelationshipKind, Set<string>>();
    for (const member of this.groupOf(golden)) {
      const relationships = this.docs.get(member)?.relationships ?? {};
      for (const kind of RELATIONSHIP_KINDS) {
        const targetGoldens = (relationships[kind] ?? [])
          .map((target) => this.golden(target))
          .filter((targetGolden) => targetGolden !== golden);
        for (const targetGolden of targetGoldens) {
          const set = result.get(kind) ?? new Set<string>();
          set.add(targetGolden);
          result.set(kind, set);
        }
      }
    }
    return new Map([...result].map(([kind, set]) => [kind, [...set].sort(compare)]));
  }

  /** All raw target ids referenced by the given goldens' groups (for `ensure`). */
  public rawRelationshipTargets(goldens: string[]): string[] {
    return goldens.flatMap((golden) =>
      this.groupOf(golden).flatMap((member) =>
        RELATIONSHIP_KINDS.flatMap((kind) => this.docs.get(member)?.relationships[kind] ?? [])
      )
    );
  }

  public riskScoreNorm(golden: string): number | undefined {
    const doc = this.docs.get(golden);
    return doc?.resolutionRiskScoreNorm ?? doc?.riskScoreNorm;
  }
}

/** Forward relationship edges (golden -> golden) of the given golden entities. */
export const buildForwardRelationshipEdges = (
  index: ResolutionIndex,
  goldens: string[]
): ClusterEdge[] =>
  goldens.flatMap((golden) =>
    [...index.relationshipTargets(golden)].flatMap(([kind, targets]) =>
      targets.map((to): ClusterEdge => ({ type: kind, from: golden, to, refKeys: [] }))
    )
  );

/**
 * Entities of one Attack Discovery, from its alert ids (via `getAlertEntities`). A failure is
 * returned to the caller, which reports the discovery as unresolved rather than empty.
 */
export const resolveDiscoveryEntities = async ({
  esClient,
  spaceId,
  alertIds,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  alertIds: string[];
  abortSignal?: AbortSignal;
}): Promise<Array<{ id: string; name?: string }>> => {
  const ids = [...new Set(alertIds)].sort(compare).slice(0, MAX_ALERT_IDS_PER_DISCOVERY);
  if (ids.length === 0) {
    return [];
  }
  const { entities } = await getAlertEntities({
    abortSignal,
    alertIds: ids,
    entityTypes: ['host', 'user', 'service'],
    esClient,
    maxEntities: MAX_ENTITIES_PER_DISCOVERY,
    spaceId,
  });
  return entities.map(({ id, name }) => ({ id, name }));
};
