/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Dead code: these exports are never imported anywhere

export interface IndexStatusSummary {
  name: string;
  docCount: number;
  health: 'green' | 'yellow' | 'red';
  isOpen: boolean;
  isFrozen: boolean;
  aliases: string[];
}

export function formatIndexStatus(summary: IndexStatusSummary): string {
  return `${summary.name} [${summary.health}] docs=${summary.docCount}`;
}

export function isIndexHealthy(summary: IndexStatusSummary): boolean {
  return summary.health === 'green' && summary.isOpen && !summary.isFrozen;
}

// Complexity hotspot: deep nesting + many branches
export function classifyIndex(
  summary: IndexStatusSummary,
  thresholds: { warnDocs: number; critDocs: number },
  options: { strictMode: boolean; checkAliases: boolean }
): { level: 'ok' | 'warn' | 'critical'; reason: string } {
  if (!summary.isOpen) {
    if (summary.isFrozen) {
      return { level: 'warn', reason: 'index is frozen and closed' };
    }
    return { level: 'warn', reason: 'index is closed' };
  }

  if (summary.health === 'red') {
    if (options.strictMode) {
      return { level: 'critical', reason: 'red health in strict mode' };
    }
    if (summary.docCount === 0) {
      return { level: 'warn', reason: 'red health but empty index' };
    }
    return { level: 'critical', reason: 'red health' };
  }

  if (summary.health === 'yellow') {
    if (options.strictMode) {
      if (summary.docCount > thresholds.critDocs) {
        return { level: 'critical', reason: 'yellow health with high doc count in strict mode' };
      }
      return { level: 'warn', reason: 'yellow health in strict mode' };
    }
    if (summary.docCount > thresholds.critDocs) {
      return { level: 'warn', reason: 'yellow health with high doc count' };
    }
  }

  if (summary.docCount > thresholds.critDocs) {
    return { level: 'critical', reason: 'doc count exceeds critical threshold' };
  }

  if (summary.docCount > thresholds.warnDocs) {
    if (options.checkAliases && summary.aliases.length === 0) {
      return { level: 'warn', reason: 'high doc count and no aliases' };
    }
    return { level: 'warn', reason: 'doc count exceeds warning threshold' };
  }

  if (options.checkAliases) {
    if (summary.aliases.length > 10) {
      if (options.strictMode) {
        return { level: 'warn', reason: 'too many aliases in strict mode' };
      }
    }
  }

  return { level: 'ok', reason: 'all checks passed' };
}
