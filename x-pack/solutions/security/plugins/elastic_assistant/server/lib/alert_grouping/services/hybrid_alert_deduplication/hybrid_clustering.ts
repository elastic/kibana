/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * HybridClustering: the main clustering engine for the Hybrid Alert Deduplication system.
 *
 * Implements a multi-stage pipeline that progressively refines alert groupings:
 *
 *   **Stage 1** – Leader clustering with cosine distance on alert feature vectors.
 *     Alerts within the high-confidence threshold are auto-clustered without LLM.
 *
 *   **Stage 2** – LLM-based clustering for uncertain cases.
 *     First checks exception list patterns (fast), then falls back to LLM comparison.
 *     When a match is found, a wildcard pattern is generated to match future
 *     similar alerts, reducing future LLM calls.
 *
 * Alerts that don't match any existing leader become new leaders themselves.
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

import type { Logger } from '@kbn/logging';

import type { AlertDocument, EnrichedAlert, HybridClusteringConfig, LLMInvokeFn } from './types';
import { getVal, getEntityStats, updateEntityStats } from './utils';
import { cosineDistance } from './vectorization';
import { exceptionlistMatch, generateMatchPattern } from './pattern_generation';
import { clusterLLM } from './llm_comparison';

// ============================================================
// HybridClustering
// ============================================================

export class HybridClustering {
  private readonly highConfidenceThreshold: number;
  private readonly lowConfidenceThreshold: number;
  private readonly rankCutoff: number;
  private readonly debugging: boolean;
  private readonly logger: Logger;
  private readonly invokeLLM: LLMInvokeFn;

  /** Leader alerts: each leader represents a unique alert cluster */
  public leaders: EnrichedAlert[] = [];

  /** Total number of LLM calls made */
  public llmCalls = 0;

  constructor({
    config = {},
    logger,
    invokeLLM,
  }: {
    config?: HybridClusteringConfig;
    logger: Logger;
    invokeLLM: LLMInvokeFn;
  }) {
    this.highConfidenceThreshold = config.highConfidenceThreshold ?? 0.004;
    this.lowConfidenceThreshold = config.lowConfidenceThreshold ?? 0.2;
    this.rankCutoff = config.rankCutoff ?? 0;
    this.debugging = config.debugging ?? false;
    this.logger = logger;
    this.invokeLLM = invokeLLM;
  }

  // ============================================================
  // Serialization
  // ============================================================

  /** Serialize leaders to a JSON string for persistence */
  public serializeLeaders(): string {
    return JSON.stringify(this.leaders, null, 2);
  }

  /** Restore leaders from a previously serialized JSON string */
  public loadLeaders(json: string): void {
    this.leaders = JSON.parse(json) as EnrichedAlert[];
  }

  // ============================================================
  // Main clustering pipeline
  // ============================================================

  /**
   * Cluster a single alert into an existing leader or create a new leader.
   *
   * @param alert - The alert to cluster. Must already have a `vector` property.
   * @returns The leader alert if a match was found, or `undefined` if the alert
   *          became a new leader.
   */
  public async clusterAlert(alert: EnrichedAlert): Promise<EnrichedAlert | undefined> {
    // Stage 1: Leader clustering with high confidence threshold
    // Always runs – cosine distance < highConfidenceThreshold is extremely reliable
    // and avoids unnecessary LLM calls even when rank-cutoff is set.
    const stage1Leader = this.stage1LeaderClustering(alert);
    if (stage1Leader) {
      return stage1Leader;
    }

    // Stage 2: LLM-based clustering for uncertain clusters
    const leader = await this.stage2LLMClustering(alert);
    if (leader) {
      return leader;
    }

    // No match found: this alert becomes a new leader
    const entities = getEntityStats([alert]);
    alert.entities = entities;
    alert.exceptions = [];
    alert.common_fields = [];
    alert.followers = [];
    this.leaders.push(alert);

    return undefined;
  }

  // ============================================================
  // Pre-check: unrelated alerts
  // ============================================================

  /**
   * Quick check to determine if two alerts should never be clustered together.
   * Based on rule name and OS type mismatches.
   */
  private unrelatedAlerts(alert1: AlertDocument, alert2: AlertDocument): boolean {
    // Different rule names → never cluster
    const ruleName1 = getVal(alert1, 'rule.name') ?? getVal(alert1, 'kibana.alert.rule.name');
    const ruleName2 = getVal(alert2, 'rule.name') ?? getVal(alert2, 'kibana.alert.rule.name');

    if (ruleName1 !== ruleName2) {
      return true;
    }

    // Don't cluster endpoint alerts across different OS types
    if (
      getVal(alert1, 'event.module') === 'endpoint' &&
      getVal(alert1, 'host.os.type') !== getVal(alert2, 'host.os.type')
    ) {
      return true;
    }

    return false;
  }

  // ============================================================
  // Stage 1: Vector-based leader clustering
  // ============================================================

  /**
   * Leader clustering using cosine distance for high-confidence duplicates.
   * Alerts within the high-confidence threshold are auto-clustered.
   */
  private stage1LeaderClustering(alert: EnrichedAlert): EnrichedAlert | undefined {
    for (const leader of this.leaders) {
      if (this.unrelatedAlerts(leader, alert)) {
        continue;
      }

      const distance = cosineDistance(leader.vector, alert.vector);
      if (distance <= this.highConfidenceThreshold) {
        updateEntityStats(leader, alert);
        if (!leader.followers) leader.followers = [];
        leader.followers.push(alert);
        return leader;
      }
    }

    return undefined;
  }

  // ============================================================
  // Stage 2: LLM-based clustering
  // ============================================================

  /**
   * LLM-based clustering for uncertain cases.
   *
   * Two-pass approach:
   * 1. First pass: check exception lists (fast pattern matching)
   * 2. Second pass: calculate distances, sort by similarity, and use LLM
   *    to compare the most similar candidates.
   */
  private async stage2LLMClustering(alert: EnrichedAlert): Promise<EnrichedAlert | undefined> {
    // First pass: check exception lists (fast)
    for (const leader of this.leaders) {
      if (this.unrelatedAlerts(leader, alert)) {
        continue;
      }

      for (const exception of leader.exceptions ?? []) {
        if (exceptionlistMatch(alert, exception)) {
          updateEntityStats(leader, alert);
          if (!leader.followers) leader.followers = [];
          leader.followers.push(alert);
          return leader;
        }
      }
    }

    // Second pass: calculate distances and sort by similarity
    const leaderDistances: Array<{ distance: number; leader: EnrichedAlert }> = [];

    for (const leader of this.leaders) {
      if (this.unrelatedAlerts(leader, alert)) {
        continue;
      }

      const distance = cosineDistance(leader.vector, alert.vector);

      if (distance <= this.lowConfidenceThreshold || this.rankCutoff) {
        leaderDistances.push({ distance, leader });
      }
    }

    // Sort by distance (closest/most similar first)
    leaderDistances.sort((a, b) => a.distance - b.distance);

    // Process leaders in order of similarity using LLM
    for (let i = 0; i < leaderDistances.length; i++) {
      const { leader } = leaderDistances[i];

      // Respect rank cutoff
      if (this.rankCutoff && i >= this.rankCutoff) {
        break;
      }

      this.llmCalls++;
      const response = await clusterLLM([leader, alert], this.invokeLLM, this.logger);

      if (response?.duplicate) {
        // Generate pattern to match on similarities
        const exception = generateMatchPattern([leader, alert], response.common_fields);

        if (exception) {
          if (!leader.exceptions) leader.exceptions = [];
          leader.exceptions.push(exception);
        }

        updateEntityStats(leader, alert);

        // Update common fields
        if (!leader.common_fields) leader.common_fields = [];
        for (const f of response.common_fields) {
          if (!leader.common_fields.includes(f)) {
            leader.common_fields.push(f);
          }
        }

        // Save follower for exception list creation
        if (!leader.followers) leader.followers = [];
        leader.followers.push(alert);

        if (this.debugging && this.rankCutoff && i !== 0) {
          this.logger.warn(`Sub-optimal vector ordering found! Match at rank ${i} instead of 0`);
        }

        return leader;
      }
    }

    // No match found
    return undefined;
  }
}
