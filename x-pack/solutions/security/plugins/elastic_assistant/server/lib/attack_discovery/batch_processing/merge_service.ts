/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AttackDiscoveryResult } from './types';

/**
 * Function type for calling LLM
 */
export type LLMCallFn = (prompt: string) => Promise<string>;

/**
 * Service for merging Attack Discovery results
 */
export class AttackDiscoveryMergeService {
  private readonly logger: Logger;
  private readonly llmCall?: LLMCallFn;

  constructor({ logger, llmCall }: { logger: Logger; llmCall?: LLMCallFn }) {
    this.logger = logger;
    this.llmCall = llmCall;
  }

  /**
   * Merge two sets of Attack Discovery results
   */
  async merge(
    discoveriesA: AttackDiscoveryResult[],
    discoveriesB: AttackDiscoveryResult[]
  ): Promise<AttackDiscoveryResult[]> {
    if (discoveriesA.length === 0) return discoveriesB;
    if (discoveriesB.length === 0) return discoveriesA;

    // First, try to identify overlapping discoveries
    const { merged, uniqueA, uniqueB } = this.identifyOverlaps(discoveriesA, discoveriesB);

    // If we have LLM available, use it for intelligent merging
    if (this.llmCall && merged.length > 0) {
      try {
        const intelligentlyMerged = await this.llmMerge(merged);
        return [...intelligentlyMerged, ...uniqueA, ...uniqueB];
      } catch (error) {
        this.logger.warn(`LLM merge failed, falling back to simple merge: ${error}`);
      }
    }

    // Fallback: simple merge of overlapping discoveries
    const simpleMerged = merged.map(({ a, b }) => this.simpleMerge(a, b));
    return [...simpleMerged, ...uniqueA, ...uniqueB];
  }

  /**
   * Identify overlapping discoveries based on alert IDs and MITRE tactics
   */
  private identifyOverlaps(
    discoveriesA: AttackDiscoveryResult[],
    discoveriesB: AttackDiscoveryResult[]
  ): {
    merged: Array<{ a: AttackDiscoveryResult; b: AttackDiscoveryResult }>;
    uniqueA: AttackDiscoveryResult[];
    uniqueB: AttackDiscoveryResult[];
  } {
    const merged: Array<{ a: AttackDiscoveryResult; b: AttackDiscoveryResult }> = [];
    const matchedBIndices = new Set<number>();

    const uniqueA: AttackDiscoveryResult[] = [];

    for (const discoveryA of discoveriesA) {
      let bestMatch: { index: number; score: number } | null = null;

      for (let i = 0; i < discoveriesB.length; i++) {
        if (matchedBIndices.has(i)) continue;

        const discoveryB = discoveriesB[i];
        const overlapScore = this.calculateOverlapScore(discoveryA, discoveryB);

        if (overlapScore > 0.3 && (!bestMatch || overlapScore > bestMatch.score)) {
          bestMatch = { index: i, score: overlapScore };
        }
      }

      if (bestMatch) {
        matchedBIndices.add(bestMatch.index);
        merged.push({ a: discoveryA, b: discoveriesB[bestMatch.index] });
      } else {
        uniqueA.push(discoveryA);
      }
    }

    const uniqueB = discoveriesB.filter((_, i) => !matchedBIndices.has(i));

    return { merged, uniqueA, uniqueB };
  }

  /**
   * Calculate overlap score between two discoveries
   */
  private calculateOverlapScore(a: AttackDiscoveryResult, b: AttackDiscoveryResult): number {
    let score = 0;

    // Alert ID overlap (weighted heavily)
    const alertSetA = new Set(a.alertIds);
    const alertSetB = new Set(b.alertIds);
    const alertOverlap = [...alertSetA].filter((id) => alertSetB.has(id)).length;
    const alertUnion = new Set([...alertSetA, ...alertSetB]).size;
    if (alertUnion > 0) {
      score += (alertOverlap / alertUnion) * 0.5;
    }

    // MITRE tactic overlap
    const tacticsA = new Set(a.mitreAttackTactics ?? []);
    const tacticsB = new Set(b.mitreAttackTactics ?? []);
    const tacticOverlap = [...tacticsA].filter((t) => tacticsB.has(t)).length;
    const tacticUnion = new Set([...tacticsA, ...tacticsB]).size;
    if (tacticUnion > 0) {
      score += (tacticOverlap / tacticUnion) * 0.3;
    }

    // Title similarity (simple word overlap)
    const wordsA = new Set(a.title.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.title.toLowerCase().split(/\s+/));
    const wordOverlap = [...wordsA].filter((w) => wordsB.has(w)).length;
    const wordUnion = new Set([...wordsA, ...wordsB]).size;
    if (wordUnion > 0) {
      score += (wordOverlap / wordUnion) * 0.2;
    }

    return score;
  }

  /**
   * Simple merge of two overlapping discoveries
   */
  private simpleMerge(a: AttackDiscoveryResult, b: AttackDiscoveryResult): AttackDiscoveryResult {
    // Combine alert IDs
    const combinedAlertIds = [...new Set([...a.alertIds, ...b.alertIds])];

    // Combine MITRE tactics
    const combinedTactics = [...new Set([...(a.mitreAttackTactics ?? []), ...(b.mitreAttackTactics ?? [])])];

    // Use higher risk score
    const riskScore = Math.max(a.riskScore ?? 0, b.riskScore ?? 0);

    // For text fields, use the one from the discovery with more alerts
    const primary = a.alertIds.length >= b.alertIds.length ? a : b;
    const secondary = a.alertIds.length >= b.alertIds.length ? b : a;

    return {
      id: a.id, // Keep first ID
      title: primary.title,
      summaryMarkdown: this.combineSummaries(primary.summaryMarkdown, secondary.summaryMarkdown),
      detailsMarkdown: this.combineDetails(primary.detailsMarkdown, secondary.detailsMarkdown),
      entitySummaryMarkdown: primary.entitySummaryMarkdown || secondary.entitySummaryMarkdown,
      alertIds: combinedAlertIds,
      mitreAttackTactics: combinedTactics,
      riskScore,
    };
  }

  /**
   * Combine summaries from two discoveries
   */
  private combineSummaries(primary: string, secondary: string): string {
    // If summaries are very similar, just use primary
    const normalizedPrimary = primary.toLowerCase().replace(/\s+/g, ' ');
    const normalizedSecondary = secondary.toLowerCase().replace(/\s+/g, ' ');

    if (normalizedPrimary.includes(normalizedSecondary) || normalizedSecondary.includes(normalizedPrimary)) {
      return primary.length >= secondary.length ? primary : secondary;
    }

    // Truncate if combined would be too long
    const maxLength = 200;
    const combined = `${primary} Additionally: ${secondary}`;
    if (combined.length <= maxLength) {
      return combined;
    }

    return primary.slice(0, maxLength - 3) + '...';
  }

  /**
   * Combine details from two discoveries
   */
  private combineDetails(primary: string, secondary: string): string {
    const maxLength = 2750;

    // If they're the same, just return primary
    if (primary === secondary) {
      return primary;
    }

    // Try to combine with separator
    const combined = `${primary}\n\n---\n\n**Additional Analysis:**\n\n${secondary}`;

    if (combined.length <= maxLength) {
      return combined;
    }

    // Truncate secondary to fit
    const availableLength = maxLength - primary.length - 50; // Buffer for separator
    if (availableLength > 100) {
      return `${primary}\n\n---\n\n**Additional Analysis:**\n\n${secondary.slice(0, availableLength)}...`;
    }

    // Just return primary if we can't fit additional info
    return primary.slice(0, maxLength);
  }

  /**
   * Use LLM for intelligent merging
   */
  private async llmMerge(
    pairs: Array<{ a: AttackDiscoveryResult; b: AttackDiscoveryResult }>
  ): Promise<AttackDiscoveryResult[]> {
    if (!this.llmCall) {
      throw new Error('LLM call function not provided');
    }

    const results: AttackDiscoveryResult[] = [];

    for (const { a, b } of pairs) {
      const prompt = this.buildMergePrompt(a, b);
      const response = await this.llmCall(prompt);

      try {
        const merged = this.parseMergeResponse(response, a, b);
        results.push(merged);
      } catch (parseError) {
        this.logger.warn(`Failed to parse LLM merge response, using simple merge: ${parseError}`);
        results.push(this.simpleMerge(a, b));
      }
    }

    return results;
  }

  /**
   * Build prompt for LLM merge
   */
  private buildMergePrompt(a: AttackDiscoveryResult, b: AttackDiscoveryResult): string {
    return `You are merging two related Attack Discovery findings into a single, coherent finding.

Discovery A:
Title: ${a.title}
Summary: ${a.summaryMarkdown}
Details: ${a.detailsMarkdown}
MITRE Tactics: ${(a.mitreAttackTactics ?? []).join(', ')}
Alert Count: ${a.alertIds.length}

Discovery B:
Title: ${b.title}
Summary: ${b.summaryMarkdown}
Details: ${b.detailsMarkdown}
MITRE Tactics: ${(b.mitreAttackTactics ?? []).join(', ')}
Alert Count: ${b.alertIds.length}

Please create a merged discovery that:
1. Combines the key insights from both discoveries
2. Creates a unified title that captures the combined attack
3. Provides a comprehensive summary (max 200 characters)
4. Combines the details into a coherent narrative (max 2750 characters)
5. Lists all unique MITRE tactics

Respond in JSON format:
{
  "title": "Combined title",
  "summaryMarkdown": "Combined summary",
  "detailsMarkdown": "Combined details",
  "mitreAttackTactics": ["tactic1", "tactic2"]
}`;
  }

  /**
   * Parse LLM merge response
   */
  private parseMergeResponse(
    response: string,
    a: AttackDiscoveryResult,
    b: AttackDiscoveryResult
  ): AttackDiscoveryResult {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Combine alert IDs from both sources
    const combinedAlertIds = [...new Set([...a.alertIds, ...b.alertIds])];

    return {
      id: a.id,
      title: parsed.title || a.title,
      summaryMarkdown: (parsed.summaryMarkdown || a.summaryMarkdown).slice(0, 200),
      detailsMarkdown: (parsed.detailsMarkdown || a.detailsMarkdown).slice(0, 2750),
      entitySummaryMarkdown: a.entitySummaryMarkdown || b.entitySummaryMarkdown,
      alertIds: combinedAlertIds,
      mitreAttackTactics: parsed.mitreAttackTactics || [
        ...new Set([...(a.mitreAttackTactics ?? []), ...(b.mitreAttackTactics ?? [])]),
      ],
      riskScore: Math.max(a.riskScore ?? 0, b.riskScore ?? 0),
    };
  }
}
