/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

interface MergeOptions {
  strategy: 'rule-based' | 'semantic';
  similarityThreshold?: number;
}

export function mergeInsights(
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  options: MergeOptions = { strategy: 'rule-based', similarityThreshold: 0.8 }
): AttackDiscovery[] {
  if (options.strategy !== 'rule-based') {
    throw new Error('Only rule-based merge implemented');
  }

  const merged = [...existing];
  const threshold = options.similarityThreshold ?? 0.8;

  for (const newInsight of newInsights) {
    const matchIndex = merged.findIndex(existingInsight => {
      // Check 1: Alert ID overlap
      const hasOverlap = existingInsight.alertIds.some(id =>
        newInsight.alertIds.includes(id)
      );
      if (hasOverlap) return true;

      // Check 2: Title similarity (Jaccard)
      const similarity = calculateTitleSimilarity(existingInsight.title, newInsight.title);
      return similarity >= threshold;
    });

    if (matchIndex >= 0) {
      // Merge with existing insight
      const existing = merged[matchIndex];
      merged[matchIndex] = {
        ...existing,
        // Combine alert IDs (deduplicated)
        alertIds: Array.from(new Set([...existing.alertIds, ...newInsight.alertIds])),
        // Append summaries
        summaryMarkdown: `${existing.summaryMarkdown}\n\n${newInsight.summaryMarkdown}`,
        detailsMarkdown: `${existing.detailsMarkdown}\n\n${newInsight.detailsMarkdown}`,
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
