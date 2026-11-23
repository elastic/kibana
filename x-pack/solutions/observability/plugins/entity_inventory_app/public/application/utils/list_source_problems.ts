/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ListResponse } from '@kbn/entity-inventory-plugin/common';

/** One problem with a source of a list response: a lost probe or query, or a partial result. */
export interface SourceProblem {
  indexPattern: string;
  /** The HTTP status Elasticsearch answered with; null when there was none. */
  status: number | null;
  reason: string;
}

const PARTIAL_RESULT_REASON = i18n.translate(
  'xpack.entityInventoryApp.sourceProblems.partialResultReason',
  {
    defaultMessage:
      'partial result: some shards or clusters did not answer, so rows may be missing',
  }
);

/**
 * The problems of a list response: the probes', then the queries' in plan order, each partial
 * result before the error of the same probe or query.
 */
export const listSourceProblems = ({
  probes,
  queries,
}: Pick<ListResponse, 'probes' | 'queries'>): SourceProblem[] =>
  [...probes, ...queries].flatMap(({ indexPattern, isPartial, error }) => [
    ...(isPartial ? [{ indexPattern, status: null, reason: PARTIAL_RESULT_REASON }] : []),
    ...(error ? [{ indexPattern, status: error.status, reason: error.reason }] : []),
  ]);
