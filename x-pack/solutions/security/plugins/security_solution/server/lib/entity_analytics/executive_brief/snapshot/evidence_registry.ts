/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BlindSpotSignalId,
  EvidenceCatalog,
  EvidenceEntry,
  EvidenceId,
} from '../../../../../common/entity_analytics/executive_brief/types';

type NumberedKind = 'ENT' | 'RULE' | 'AD' | 'LEAD' | 'CASE' | 'ANOM';

/**
 * Hands out stable evidence ids across all snapshot parts. The same source key always gets the
 * same id within a job; numbering follows first registration order, so callers must register in
 * a deterministic order.
 */
export class EvidenceRegistry {
  private readonly catalog: EvidenceCatalog = {};
  private readonly keys = new Map<string, EvidenceId>();
  private readonly counters: Record<NumberedKind, number> = {
    ENT: 0,
    RULE: 0,
    AD: 0,
    LEAD: 0,
    CASE: 0,
    ANOM: 0,
  };

  private numbered(kind: NumberedKind, key: string, entry: EvidenceEntry): EvidenceId {
    const mapKey = `${kind}:${key}`;
    const existing = this.keys.get(mapKey);
    if (existing) {
      return existing;
    }
    this.counters[kind] += 1;
    const id = `${kind}-${this.counters[kind]}` as EvidenceId;
    this.keys.set(mapKey, id);
    this.catalog[id] = entry;
    return id;
  }

  /** Register an entity by golden euid. */
  public entity(euid: string): `ENT-${string}` {
    return this.numbered('ENT', euid, { kind: 'entity', euid }) as `ENT-${string}`;
  }

  public rule(entry: Extract<EvidenceEntry, { kind: 'rule' }>): `RULE-${string}` {
    return this.numbered('RULE', entry.ruleId, entry) as `RULE-${string}`;
  }

  public attackDiscovery(entry: Extract<EvidenceEntry, { kind: 'attack_discovery' }>): EvidenceId {
    return this.numbered('AD', entry.id, entry);
  }

  public lead(entry: Extract<EvidenceEntry, { kind: 'lead' }>): EvidenceId {
    return this.numbered('LEAD', entry.id, entry);
  }

  public case(entry: Extract<EvidenceEntry, { kind: 'case' }>): `CASE-${string}` {
    return this.numbered('CASE', entry.caseId, entry) as `CASE-${string}`;
  }

  public anomaly(entry: Extract<EvidenceEntry, { kind: 'anomaly' }>): EvidenceId {
    return this.numbered('ANOM', entry.jobId, entry);
  }

  public tactic(tacticId: string): `TAC-${string}` {
    const id = `TAC-${tacticId}` as const;
    this.catalog[id] = { kind: 'tactic', tacticId };
    return id;
  }

  public gap(signal: BlindSpotSignalId): `GAP-${BlindSpotSignalId}` {
    const id = `GAP-${signal}` as const;
    this.catalog[id] = { kind: 'gap', signal };
    return id;
  }

  public story(rank: number): `STORY-${number}` {
    const id = `STORY-${rank}` as const;
    this.catalog[id] = { kind: 'story', rank };
    return id;
  }

  public event(storyRank: number, index: number): `EVT-${string}` {
    const id = `EVT-${storyRank}-${index}` as const;
    this.catalog[id] = { kind: 'event', storyEvidenceId: `STORY-${storyRank}` };
    return id;
  }

  public has(id: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.catalog, id);
  }

  public entityEuids(): string[] {
    return Object.values(this.catalog).flatMap((entry) =>
      entry.kind === 'entity' ? [entry.euid] : []
    );
  }

  public toCatalog(): EvidenceCatalog {
    return { ...this.catalog };
  }
}
