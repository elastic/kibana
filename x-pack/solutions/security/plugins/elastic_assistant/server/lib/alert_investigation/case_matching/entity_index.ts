/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedEntity } from '../types';

interface CaseWithObservables {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly observables: Array<{
    readonly typeKey: string;
    readonly value: string;
  }>;
}

/**
 * Inverted Entity Index for Fast Case Matching
 *
 * Problem: O(n*m*k) complexity - for each alert, compare against ALL cases
 * - 500 alerts × 100 cases × 20 entities = 1,000,000 comparisons
 *
 * Solution: Build inverted index entity → case_ids (O(m) build, O(n*k) lookup)
 * - Build: 100 cases × 10 observables = 1,000 index entries
 * - Lookup: 500 alerts × 20 entities = 10,000 lookups
 * - Total: ~11,000 operations (99% reduction!)
 *
 * This optimization eliminates the 100-case pagination limit bottleneck.
 */

export class CaseEntityIndex {
  // entity_key → Set of case IDs that contain this entity
  private readonly entityToCases = new Map<string, Set<string>>();

  // case_id → full case object (for scoring phase)
  private readonly casesById = new Map<string, CaseWithObservables>();

  constructor(
    cases: CaseWithObservables[],
    private readonly normalizeTypeKey: (key: string) => string
  ) {
    this.buildIndex(cases);
  }

  /**
   * Build inverted index: entity → case_ids
   * Complexity: O(m*k) where m=cases, k=observables per case
   */
  private buildIndex(cases: CaseWithObservables[]): void {
    for (const caseObj of cases) {
      this.casesById.set(caseObj.id, caseObj);

      for (const obs of caseObj.observables) {
        const normalizedTypeKey = this.normalizeTypeKey(obs.typeKey);
        const entityKey = `${normalizedTypeKey}::${obs.value.toLowerCase()}`;

        const caseSet = this.entityToCases.get(entityKey) ?? new Set<string>();
        caseSet.add(caseObj.id);
        this.entityToCases.set(entityKey, caseSet);
      }
    }
  }

  /**
   * Find all cases that share at least one entity with the alert
   * Complexity: O(k) where k=entities in alert
   */
  findCandidateCases(alertEntities: ExtractedEntity[]): Set<string> {
    const candidates = new Set<string>();

    for (const entity of alertEntities) {
      const normalizedTypeKey = this.normalizeTypeKey(entity.typeKey);
      const entityKey = `${normalizedTypeKey}::${entity.value.toLowerCase()}`;
      const matchingCases = this.entityToCases.get(entityKey);

      if (matchingCases) {
        matchingCases.forEach((caseId) => candidates.add(caseId));
      }
    }

    return candidates;
  }

  /**
   * Get full case object by ID
   */
  getCaseById(caseId: string): CaseWithObservables | undefined {
    return this.casesById.get(caseId);
  }

  /**
   * Get total indexed cases
   */
  size(): number {
    return this.casesById.size;
  }

  /**
   * Get index statistics for logging/monitoring
   */
  getStats(): {
    totalCases: number;
    totalUniqueEntities: number;
    avgEntitiesPerCase: number;
  } {
    const totalEntities = Array.from(this.casesById.values()).reduce(
      (sum, c) => sum + c.observables.length,
      0
    );

    return {
      totalCases: this.casesById.size,
      totalUniqueEntities: this.entityToCases.size,
      avgEntitiesPerCase: this.casesById.size > 0 ? totalEntities / this.casesById.size : 0,
    };
  }
}
