/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageReportBehavior } from '../../../../../common/step_types/package_report';
import { stripEsqlComments } from './coverage_data_sources';
import type { CoverageBehavior, EsqlStatus } from './types';

/** CE's attribute string cap; a longer query is omitted rather than sliced into invalid ES|QL. */
export const MAX_VALIDATED_ESQL_CHARS = 10_000;

/** What Tier 2 stores when it could not ground a query; not a query worth handing a rule author. */
const UNAVAILABLE_PLACEHOLDER = 'Grounded ES|QL generation unavailable';

/** Normalizes coordinator behaviors, keeping only the ones that executed with a real query. */
export const toCoverageBehaviors = (behaviors: PackageReportBehavior[]): CoverageBehavior[] =>
  behaviors.flatMap((behavior) =>
    behavior.execution?.executed === true &&
    /^\s*FROM\s/im.test(stripEsqlComments(behavior.validated_esql))
      ? [
          {
            techniqueId: behavior.technique_id,
            ...(behavior.technique_name ? { techniqueName: behavior.technique_name } : {}),
            ...(behavior.title ? { title: behavior.title } : {}),
            ...(behavior.evidence_quote ? { evidenceQuote: behavior.evidence_quote } : {}),
            confidence: behavior.confidence,
            ...(behavior.severity ? { severity: behavior.severity } : {}),
            validatedEsql: behavior.validated_esql,
            rowCount: behavior.execution.row_count,
            hit: behavior.execution.hit,
          },
        ]
      : []
  );

export interface SelectedEsql {
  validatedEsql?: string;
  esqlStatus?: EsqlStatus;
  /** Why no query is attached, for the `ES|QL:` line in `content`. */
  omittedReason?: 'none_executed' | 'too_long';
  behavior?: CoverageBehavior;
}

/**
 * The query a coverage subject carries. A technique subject takes its own behavior, preferring
 * the one with the most rows, then the higher confidence; the report-scoped subject takes the
 * highest-confidence behavior that executed.
 */
export const selectCoverageBehavior = ({
  behaviors,
  techniqueId,
}: {
  behaviors: CoverageBehavior[];
  techniqueId?: string;
}): SelectedEsql => {
  const candidates = behaviors.filter(
    (behavior) =>
      !behavior.validatedEsql.startsWith(UNAVAILABLE_PLACEHOLDER) &&
      (techniqueId === undefined || behavior.techniqueId === techniqueId)
  );
  const [best] = [...candidates].sort((a, b) =>
    techniqueId === undefined
      ? b.confidence - a.confidence
      : b.rowCount - a.rowCount || b.confidence - a.confidence
  );
  if (!best) return { omittedReason: 'none_executed' };
  // Tier 2's `//` header (generator note, report id fragment) is provenance, not part of the
  // query a rule author reuses.
  const validatedEsql = stripEsqlComments(best.validatedEsql).trim();
  if (validatedEsql.length > MAX_VALIDATED_ESQL_CHARS) {
    return { omittedReason: 'too_long', behavior: best };
  }
  return {
    validatedEsql,
    esqlStatus: best.hit ? 'executed_hit' : 'executed_no_rows',
    behavior: best,
  };
};
