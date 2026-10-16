/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deduplicateEvidence } from '../deduplicate_evidence';
import type { QueryTemplate } from '../models/query_codec';
import { templateIdentity } from './template_identity';

/** Carries template metadata needed for identity and later catalog persistence without performing I/O. */
export interface GeneratedTemplate extends QueryTemplate {
  readonly extractorVersion: string;
  readonly id: string;
  readonly logLevel?: string;
  readonly repository: string;
  readonly revision: string;
  readonly severityScore?: number;
}

/** Returns the numeric severity used to select metadata without treating an absent score as a real severity. */
const comparableSeverity = (template: GeneratedTemplate): number =>
  template.severityScore ?? Number.NEGATIVE_INFINITY;

/** Groups equivalent templates, retaining sorted evidence and metadata from the highest-severity occurrence. */
export const deduplicateTemplates = (
  templates: readonly GeneratedTemplate[]
): readonly GeneratedTemplate[] => {
  /** Holds every occurrence per query-level identity until their winning metadata can be resolved together. */
  const byIdentity: Map<string, GeneratedTemplate[]> = new Map();
  for (const template of templates) {
    /** Derives identity from immutable scope rather than trusting a caller-supplied ID. */
    const id: string = templateIdentity(template);
    /** Collects every equivalent occurrence so equal-severity log-level conflicts are order-independent. */
    const occurrences: GeneratedTemplate[] = byIdentity.get(id) ?? [];
    occurrences.push(template);
    byIdentity.set(id, occurrences);
  }
  /** Merges each identity group after every competing severity and level is known. */
  const deduplicated: GeneratedTemplate[] = [...byIdentity.entries()].map(([id, occurrences]) => {
    /** The earliest occurrence retains stable non-severity metadata for equivalent query templates. */
    const first: GeneratedTemplate = occurrences[0];
    /** Selects the maximum available severity across every matching source location. */
    const severityScore: number = Math.max(...occurrences.map(comparableSeverity));
    /** Limits log-level metadata to occurrences that supplied the selected severity. */
    const winningLevels: readonly string[] = [
      ...new Set(
        occurrences
          .filter((occurrence) => comparableSeverity(occurrence) === severityScore)
          .flatMap((occurrence) => (occurrence.logLevel === undefined ? [] : [occurrence.logLevel]))
      ),
    ];
    /** A tied severity with different levels has no deterministic level metadata to retain. */
    const logLevel: string | undefined = winningLevels.length === 1 ? winningLevels[0] : undefined;
    /** Separates occurrence-specific metadata so losing severity and log levels cannot survive the merge. */
    const {
      logLevel: _firstLogLevel,
      severityScore: _firstSeverityScore,
      ...template
    }: GeneratedTemplate = first;
    /** Merges source evidence independently of the occurrence that supplied metadata. */
    const evidence = deduplicateEvidence(occurrences.flatMap((occurrence) => occurrence.evidence));
    return {
      ...template,
      evidence,
      id,
      ...(logLevel === undefined ? {} : { logLevel }),
      ...(severityScore === Number.NEGATIVE_INFINITY ? {} : { severityScore }),
    };
  });
  return deduplicated.sort((left, right) => left.id.localeCompare(right.id));
};
