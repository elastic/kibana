/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

import type {
  ObservableTypeKey,
  type ExtractedEntity,
  type GroupingConfig,
  type CaseMatch,
  GroupingStrategy,
  DEFAULT_ENTITY_TYPE_CONFIGS,
} from '../types';

/**
 * Observable data from a case
 */
export interface CaseObservable {
  id?: string;
  typeKey: string;
  value: string;
  description?: string | null;
}

/**
 * Case data for matching
 */
export interface CaseData {
  id: string;
  title: string;
  status: string;
  observables: CaseObservable[];
  alertIds?: string[];
  alertCount?: number;
  createdAt?: string;
  updatedAt?: string;
  /** Timestamp of the earliest alert in the case */
  earliestAlertTimestamp?: string;
  /** Timestamp of the latest alert in the case */
  latestAlertTimestamp?: string;
}

/**
 * Service for matching alerts to cases based on entity observables
 */
export class CaseMatchingService {
  private readonly logger: Logger;
  private readonly groupingConfig: GroupingConfig;

  constructor({ logger, groupingConfig }: { logger: Logger; groupingConfig: GroupingConfig }) {
    this.logger = logger;
    this.groupingConfig = groupingConfig;
  }

  /**
   * Find matching cases for extracted entities
   * @param entities - Entities extracted from the alert
   * @param cases - Candidate cases to match against
   * @param alertTimestamp - Optional timestamp of the alert for time proximity filtering
   */
  public findMatchingCases(
    entities: ExtractedEntity[],
    cases: CaseData[],
    alertTimestamp?: string
  ): CaseMatch[] {
    const matches: CaseMatch[] = [];
    const timeProximityMs = this.parseTimeProximityWindow();

    for (const caseData of cases) {
      // Check time proximity if configured
      if (timeProximityMs !== null && alertTimestamp) {
        if (!this.isWithinTimeProximity(alertTimestamp, caseData, timeProximityMs)) {
          this.logger.debug(`Case ${caseData.id} excluded due to time proximity constraint`);
          continue;
        }
      }

      const match = this.evaluateCaseMatch(entities, caseData);
      if (match) {
        matches.push(match);
      }
    }

    // Sort by match score descending, then by most recently updated
    matches.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // Secondary sort by creation date (most recent first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    this.logger.debug(
      `Found ${matches.length} matching cases for ${entities.length} entities${
        timeProximityMs ? ` (with ${this.groupingConfig.timeProximityWindow} time window)` : ''
      }`
    );

    return matches;
  }

  /**
   * Parse the time proximity window configuration into milliseconds
   */
  private parseTimeProximityWindow(): number | null {
    const timeWindow = this.groupingConfig.timeProximityWindow;
    if (!timeWindow) {
      return null;
    }

    // Parse ISO 8601 duration (simplified: supports hours and days)
    const match = timeWindow.match(/^(\d+)([hdm])$/i);
    if (!match) {
      this.logger.warn(`Invalid timeProximityWindow format: ${timeWindow}`);
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'm':
        return value * 60 * 1000; // minutes
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      default:
        return null;
    }
  }

  /**
   * Check if an alert is within the time proximity window of a case
   */
  private isWithinTimeProximity(
    alertTimestamp: string,
    caseData: CaseData,
    timeProximityMs: number
  ): boolean {
    const alertTime = new Date(alertTimestamp).getTime();

    // If the case has alert timestamp info, use it
    if (caseData.latestAlertTimestamp) {
      const caseLatestTime = new Date(caseData.latestAlertTimestamp).getTime();
      const caseEarliestTime = caseData.earliestAlertTimestamp
        ? new Date(caseData.earliestAlertTimestamp).getTime()
        : caseLatestTime;

      // Alert should be within the time window of the case's alert range
      // Allow alerts to extend the window on either end
      const windowStart = caseEarliestTime - timeProximityMs;
      const windowEnd = caseLatestTime + timeProximityMs;

      return alertTime >= windowStart && alertTime <= windowEnd;
    }

    // Fall back to case creation/update time
    const caseTime = caseData.updatedAt
      ? new Date(caseData.updatedAt).getTime()
      : caseData.createdAt
      ? new Date(caseData.createdAt).getTime()
      : Date.now();

    const timeDiff = Math.abs(alertTime - caseTime);
    return timeDiff <= timeProximityMs;
  }

  /**
   * Evaluate if a case matches the entities based on the grouping strategy
   */
  private evaluateCaseMatch(entities: ExtractedEntity[], caseData: CaseData): CaseMatch | null {
    const matchedObservables: CaseMatch['matchedObservables'] = [];

    // Build observable lookup by type and value
    const observablesByTypeValue = new Map<string, CaseObservable>();
    for (const observable of caseData.observables) {
      const key = `${observable.typeKey}:${observable.value.toLowerCase()}`;
      observablesByTypeValue.set(key, observable);
    }

    // Find matching entities
    for (const entity of entities) {
      const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;
      const matchingObservable = observablesByTypeValue.get(key);

      if (matchingObservable) {
        matchedObservables.push({
          observableId: matchingObservable.id ?? '',
          type: entity.type,
          value: entity.normalizedValue,
          matchedEntity: entity,
        });
      }
    }

    if (matchedObservables.length === 0) {
      return null;
    }

    // Calculate match score based on strategy
    const matchScore = this.calculateMatchScore(entities, matchedObservables, caseData);

    // Check if match meets threshold based on strategy
    if (!this.meetsMatchThreshold(matchScore, matchedObservables, entities)) {
      return null;
    }

    return {
      caseId: caseData.id,
      caseTitle: caseData.title,
      caseStatus: caseData.status,
      matchScore,
      matchedObservables,
      alertCount: caseData.alertCount,
      createdAt: caseData.createdAt,
    };
  }

  /**
   * Calculate match score based on grouping strategy
   */
  private calculateMatchScore(
    entities: ExtractedEntity[],
    matchedObservables: CaseMatch['matchedObservables'],
    _caseData: CaseData
  ): number {
    switch (this.groupingConfig.strategy) {
      case GroupingStrategy.Strict:
        return this.calculateStrictScore(entities, matchedObservables);

      case GroupingStrategy.Relaxed:
        return this.calculateRelaxedScore(entities, matchedObservables);

      case GroupingStrategy.Weighted:
        return this.calculateWeightedScore(entities, matchedObservables);

      case GroupingStrategy.Temporal:
        // For temporal, we use weighted score and apply time window filtering separately
        return this.calculateWeightedScore(entities, matchedObservables);

      default:
        return this.calculateRelaxedScore(entities, matchedObservables);
    }
  }

  /**
   * Calculate strict matching score
   * All required entity types must match
   */
  private calculateStrictScore(
    entities: ExtractedEntity[],
    matchedObservables: CaseMatch['matchedObservables']
  ): number {
    const requiredTypes = this.groupingConfig.entityTypes
      .filter((config) => config.required)
      .map((config) => config.type);

    if (requiredTypes.length === 0) {
      // No required types specified, fall back to relaxed
      return this.calculateRelaxedScore(entities, matchedObservables);
    }

    // Check if all required types have at least one match
    const matchedTypes = new Set(matchedObservables.map((m) => m.type));
    const allRequiredMatched = requiredTypes.every((type) => matchedTypes.has(type));

    if (!allRequiredMatched) {
      return 0;
    }

    // Score is based on how many required types matched
    return requiredTypes.length / requiredTypes.length; // 1.0 if all match
  }

  /**
   * Calculate relaxed matching score
   * Any match counts, score is proportion of entities matched
   */
  private calculateRelaxedScore(
    entities: ExtractedEntity[],
    matchedObservables: CaseMatch['matchedObservables']
  ): number {
    if (entities.length === 0) {
      return 0;
    }

    // Score is based on number of matched entities
    const uniqueMatchedEntities = new Set(matchedObservables.map((m) => `${m.type}:${m.value}`));

    return Math.min(1, uniqueMatchedEntities.size / entities.length);
  }

  /**
   * Calculate weighted matching score
   * Uses entity type weights to calculate score
   */
  private calculateWeightedScore(
    entities: ExtractedEntity[],
    matchedObservables: CaseMatch['matchedObservables']
  ): number {
    if (entities.length === 0 || matchedObservables.length === 0) {
      return 0;
    }

    // Build weight lookup
    const weightsByType = new Map<ObservableTypeKey, number>();
    for (const config of this.groupingConfig.entityTypes) {
      weightsByType.set(config.type, config.weight ?? 1);
    }

    // Fall back to defaults for types not in config
    for (const defaultConfig of DEFAULT_ENTITY_TYPE_CONFIGS) {
      if (!weightsByType.has(defaultConfig.type)) {
        weightsByType.set(defaultConfig.type, defaultConfig.weight ?? 1);
      }
    }

    // Calculate total possible weight from entities
    let totalPossibleWeight = 0;
    const entityTypes = new Set<ObservableTypeKey>();
    for (const entity of entities) {
      if (!entityTypes.has(entity.type)) {
        entityTypes.add(entity.type);
        totalPossibleWeight += weightsByType.get(entity.type) ?? 1;
      }
    }

    // Calculate matched weight
    let matchedWeight = 0;
    const matchedTypes = new Set<ObservableTypeKey>();
    for (const match of matchedObservables) {
      if (!matchedTypes.has(match.type)) {
        matchedTypes.add(match.type);
        matchedWeight += weightsByType.get(match.type) ?? 1;
      }
    }

    if (totalPossibleWeight === 0) {
      return 0;
    }

    return matchedWeight / totalPossibleWeight;
  }

  /**
   * Check if match meets threshold based on strategy
   */
  private meetsMatchThreshold(
    matchScore: number,
    matchedObservables: CaseMatch['matchedObservables'],
    entities: ExtractedEntity[]
  ): boolean {
    switch (this.groupingConfig.strategy) {
      case GroupingStrategy.Strict:
        // For strict, score must be 1.0 (all required matched)
        return matchScore === 1.0;

      case GroupingStrategy.Relaxed:
        // For relaxed, any match is sufficient
        return matchedObservables.length > 0;

      case GroupingStrategy.Weighted:
      case GroupingStrategy.Temporal:
        // For weighted/temporal, use configured threshold
        const threshold = this.groupingConfig.threshold ?? 0.5;
        return matchScore >= threshold;

      default:
        return matchedObservables.length > 0;
    }
  }

  /**
   * Select the best matching case from multiple matches
   * Used when an alert matches multiple cases
   */
  public selectBestMatch(matches: CaseMatch[]): CaseMatch | null {
    if (matches.length === 0) {
      return null;
    }

    // Already sorted by score and date in findMatchingCases
    return matches[0];
  }

  /**
   * Group alerts by their best matching case
   * Returns map of caseId -> alertIds
   */
  public groupAlertsByCase(
    alertEntities: Map<string, ExtractedEntity[]>,
    cases: CaseData[]
  ): Map<string, string[]> {
    const grouping = new Map<string, string[]>();
    const unmatchedAlerts: string[] = [];

    for (const [alertId, entities] of alertEntities) {
      const matches = this.findMatchingCases(entities, cases);
      const bestMatch = this.selectBestMatch(matches);

      if (bestMatch) {
        const existing = grouping.get(bestMatch.caseId) ?? [];
        existing.push(alertId);
        grouping.set(bestMatch.caseId, existing);
      } else {
        unmatchedAlerts.push(alertId);
      }
    }

    // Store unmatched alerts with special key
    if (unmatchedAlerts.length > 0) {
      grouping.set('__unmatched__', unmatchedAlerts);
    }

    this.logger.debug(
      `Grouped ${alertEntities.size} alerts into ${
        grouping.size - (grouping.has('__unmatched__') ? 1 : 0)
      } cases, ${unmatchedAlerts.length} unmatched`
    );

    return grouping;
  }

  /**
   * Calculate entity overlap between two sets of entities
   * Used for potential case merging
   */
  public calculateEntityOverlap(
    entitiesA: ExtractedEntity[],
    entitiesB: ExtractedEntity[]
  ): number {
    if (entitiesA.length === 0 || entitiesB.length === 0) {
      return 0;
    }

    const setA = new Set(entitiesA.map((e) => `${e.type}:${e.normalizedValue.toLowerCase()}`));
    const setB = new Set(entitiesB.map((e) => `${e.type}:${e.normalizedValue.toLowerCase()}`));

    let overlapCount = 0;
    for (const key of setA) {
      if (setB.has(key)) {
        overlapCount++;
      }
    }

    // Jaccard similarity: intersection / union
    const unionSize = setA.size + setB.size - overlapCount;
    return unionSize > 0 ? overlapCount / unionSize : 0;
  }

  /**
   * Calculate entity overlap between two cases
   * Convenience method that converts case observables to entities
   */
  public calculateCaseEntityOverlap(caseA: CaseData, caseB: CaseData): number {
    if (caseA.observables.length === 0 || caseB.observables.length === 0) {
      return 0;
    }

    const setA = new Set(caseA.observables.map((o) => `${o.typeKey}:${o.value.toLowerCase()}`));
    const setB = new Set(caseB.observables.map((o) => `${o.typeKey}:${o.value.toLowerCase()}`));

    let overlapCount = 0;
    for (const key of setA) {
      if (setB.has(key)) {
        overlapCount++;
      }
    }

    // Jaccard similarity: intersection / union
    const unionSize = setA.size + setB.size - overlapCount;
    return unionSize > 0 ? overlapCount / unionSize : 0;
  }

  /**
   * Find cases that could potentially be merged due to high entity overlap
   * Uses case observables directly instead of requiring entity extraction
   */
  public findMergeableCasesByObservables(
    cases: CaseData[],
    mergeThreshold?: number
  ): Array<{ caseId1: string; caseId2: string; overlapScore: number }> {
    const threshold = mergeThreshold ?? this.groupingConfig.mergeThreshold ?? 0.7;
    const mergeable: Array<{ caseId1: string; caseId2: string; overlapScore: number }> = [];

    // Compare all pairs of cases
    for (let i = 0; i < cases.length; i++) {
      for (let j = i + 1; j < cases.length; j++) {
        const overlapScore = this.calculateCaseEntityOverlap(cases[i], cases[j]);

        if (overlapScore >= threshold) {
          mergeable.push({
            caseId1: cases[i].id,
            caseId2: cases[j].id,
            overlapScore,
          });
        }
      }
    }

    // Sort by overlap score descending
    mergeable.sort((a, b) => b.overlapScore - a.overlapScore);

    return mergeable;
  }

  /**
   * Find cases that could potentially be merged due to high entity overlap
   */
  public findMergeableCases(
    cases: CaseData[],
    entityExtractor: (caseData: CaseData) => ExtractedEntity[]
  ): Array<{ caseA: string; caseB: string; overlapScore: number }> {
    const mergeThreshold = this.groupingConfig.mergeThreshold ?? 0.7;
    const mergeable: Array<{ caseA: string; caseB: string; overlapScore: number }> = [];

    // Compare all pairs of cases
    for (let i = 0; i < cases.length; i++) {
      for (let j = i + 1; j < cases.length; j++) {
        const entitiesA = entityExtractor(cases[i]);
        const entitiesB = entityExtractor(cases[j]);
        const overlapScore = this.calculateEntityOverlap(entitiesA, entitiesB);

        if (overlapScore >= mergeThreshold) {
          mergeable.push({
            caseA: cases[i].id,
            caseB: cases[j].id,
            overlapScore,
          });
        }
      }
    }

    // Sort by overlap score descending
    mergeable.sort((a, b) => b.overlapScore - a.overlapScore);

    return mergeable;
  }

  /**
   * Create a new case matching service with custom grouping config
   */
  public static withConfig(groupingConfig?: Partial<GroupingConfig>): CaseMatchingService {
    const defaultConfig: GroupingConfig = {
      strategy: GroupingStrategy.Weighted,
      entityTypes: DEFAULT_ENTITY_TYPE_CONFIGS,
      threshold: 0.7, // Raised from 0.5 to prevent over-merging on generic entities
      hostPrimaryGrouping: true,
      createNewCaseIfNoMatch: true,
      maxAlertsPerCase: 1000,
      mergeSimilarCases: false,
      mergeThreshold: 0.7,
    };

    // Create a simple no-op logger for static factory usage
    const noopLogger: Logger = {
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      log: () => {},
      get: () => noopLogger,
      isLevelEnabled: () => false,
    } as unknown as Logger;

    const config = groupingConfig ?? {};

    return new CaseMatchingService({
      logger: noopLogger,
      groupingConfig: {
        ...defaultConfig,
        ...config,
        entityTypes: config.entityTypes ?? defaultConfig.entityTypes,
      },
    });
  }
}
