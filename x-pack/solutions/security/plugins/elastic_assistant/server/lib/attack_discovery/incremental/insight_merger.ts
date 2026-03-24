/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { STOP_WORDS } from './types';

interface MergeOptions {
  strategy: 'rule-based';
  similarityThreshold?: number;
}

export function mergeInsights(
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  options: MergeOptions = { strategy: 'rule-based', similarityThreshold: 0.6 }
): AttackDiscovery[] {
  const merged = [...existing];
  const threshold = options.similarityThreshold ?? 0.6;

  for (const newInsight of newInsights) {
    const matchIndex = merged.findIndex(existingInsight => {
      // Check 1: Alert ID overlap — only merge if significant overlap (>= 30% shared)
      const sharedIds = existingInsight.alertIds.filter(id =>
        newInsight.alertIds.includes(id)
      );
      const overlapRatio = sharedIds.length /
        Math.min(existingInsight.alertIds.length, newInsight.alertIds.length || 1);
      if (overlapRatio >= 0.3) return true;

      // Check 2: Title similarity — only for insights that cover similar-sized alert sets
      // Prevents merging a broad "catch-all" insight with a specific one
      const sizeDiff = Math.abs(existingInsight.alertIds.length - newInsight.alertIds.length);
      const maxSize = Math.max(existingInsight.alertIds.length, newInsight.alertIds.length, 1);
      if (sizeDiff / maxSize > 0.7) return false; // very different coverage — keep separate

      const similarity = calculateTitleSimilarity(existingInsight.title, newInsight.title);
      if (similarity >= threshold) {
        const commonMeaningfulWords = countCommonMeaningfulWords(
          existingInsight.title,
          newInsight.title
        );
        return commonMeaningfulWords >= 2;
      }

      return false;
    });

    if (matchIndex >= 0) {
      // Merge with existing insight
      const target = merged[matchIndex];
      merged[matchIndex] = {
        ...target,
        // Combine alert IDs (deduplicated)
        alertIds: Array.from(new Set([...target.alertIds, ...newInsight.alertIds])),
        // Only append summaryMarkdown if substantially different
        summaryMarkdown: isSubstantiallyDifferent(target.summaryMarkdown, newInsight.summaryMarkdown)
          ? `${target.summaryMarkdown}\n\n${newInsight.summaryMarkdown}`
          : target.summaryMarkdown,
        // Only append detailsMarkdown if substantially different
        detailsMarkdown: isSubstantiallyDifferent(target.detailsMarkdown, newInsight.detailsMarkdown)
          ? `${target.detailsMarkdown}\n\n${newInsight.detailsMarkdown}`
          : target.detailsMarkdown,
        // Merge entitySummaryMarkdown if present
        entitySummaryMarkdown: mergeOptionalMarkdown(
          target.entitySummaryMarkdown,
          newInsight.entitySummaryMarkdown
        ),
        // Merge mitreAttackTactics if present
        mitreAttackTactics: mergeOptionalStringArrays(
          target.mitreAttackTactics,
          newInsight.mitreAttackTactics
        ),
      };
    } else {
      // Add as new insight
      merged.push(newInsight);
    }
  }

  return merged;
}

function calculateTitleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

function countCommonMeaningfulWords(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().split(/\W+/).filter(w => w && !STOP_WORDS.has(w))
  );
  const wordsB = new Set(
    b.toLowerCase().split(/\W+/).filter(w => w && !STOP_WORDS.has(w))
  );

  return [...wordsA].filter(w => wordsB.has(w)).length;
}

/**
 * Returns true if the new text has more than 50% different words compared to existing text.
 */
function isSubstantiallyDifferent(existing: string, incoming: string): boolean {
  const existingWords = new Set(existing.toLowerCase().split(/\W+/).filter(Boolean));
  const incomingWords = incoming.toLowerCase().split(/\W+/).filter(Boolean);

  if (incomingWords.length === 0) return false;

  const differentCount = incomingWords.filter(w => !existingWords.has(w)).length;
  return differentCount / incomingWords.length > 0.5;
}

function mergeOptionalMarkdown(
  existing: string | undefined,
  incoming: string | undefined
): string | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;

  if (isSubstantiallyDifferent(existing, incoming)) {
    return `${existing}\n\n${incoming}`;
  }
  return existing;
}

function mergeOptionalStringArrays(
  existing: string[] | undefined,
  incoming: string[] | undefined
): string[] | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;

  return Array.from(new Set([...existing, ...incoming]));
}
