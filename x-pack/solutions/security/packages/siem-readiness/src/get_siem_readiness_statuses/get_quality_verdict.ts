/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisibilityStatus } from '../types';

/**
 * Appended when rule index resolution failed for some rules, so the required-field coverage list
 * may be undercounted. Shared by the summary line and the noData note.
 */
export const QUALITY_RULES_PARTIAL_CAVEAT =
  'index resolution failed for some rules — the required-field coverage list may be incomplete';

export interface QualityVerdictInput {
  /** Indices with quality-check results in scope — all indices for the orchestrator, the
   * category-filtered subset for the agent tool. */
  checkedCount: number;
  /** Indices whose ECS field mappings are incompatible. */
  incompatibleCount: number;
  /** Rules whose required_fields are not fully mapped in their queried indices. */
  missingFieldCount: number;
  /** True when rule index resolution failed for some rules (coverage list may be incomplete). */
  rulesPartial: boolean;
}

export interface QualityVerdict {
  status: VisibilityStatus;
  summary: string;
}

/**
 * Single source of truth for the Quality dimension verdict (status + summary). Both the getQuality
 * orchestrator (all indices) and the agent tool (category-filtered subset) derive their verdict
 * from this function so the two surfaces always reach — and phrase — the same conclusion. Callers
 * only differ in the counts they pass in.
 */
export const getQualityVerdict = ({
  checkedCount,
  incompatibleCount,
  missingFieldCount,
  rulesPartial,
}: QualityVerdictInput): QualityVerdict => {
  const status: VisibilityStatus =
    checkedCount === 0 && missingFieldCount === 0
      ? 'noData'
      : incompatibleCount > 0 || missingFieldCount > 0
      ? 'actionsRequired'
      : 'healthy';

  return {
    status,
    summary: buildSummary({
      status,
      checkedCount,
      incompatibleCount,
      missingFieldCount,
      rulesPartial,
    }),
  };
};

const buildSummary = ({
  status,
  checkedCount,
  incompatibleCount,
  missingFieldCount,
  rulesPartial,
}: QualityVerdictInput & { status: VisibilityStatus }): string => {
  if (status === 'noData') {
    const base =
      'No quality check results available. Run the Data Quality dashboard to see results.';
    return rulesPartial ? `${base} Note: ${QUALITY_RULES_PARTIAL_CAVEAT}.` : base;
  }

  const parts: string[] = [];
  if (incompatibleCount > 0) {
    parts.push(
      `${incompatibleCount} of ${checkedCount} indices have incompatible ECS field mappings`
    );
  }
  if (missingFieldCount > 0) {
    parts.push(
      `${missingFieldCount} rule(s) have required fields not fully mapped in their queried indices`
    );
  }
  if (rulesPartial) {
    parts.push(QUALITY_RULES_PARTIAL_CAVEAT);
  }

  return parts.length > 0
    ? `${parts.join('; ')}.`
    : `All ${checkedCount} checked indices have compatible ECS field mappings.`;
};
