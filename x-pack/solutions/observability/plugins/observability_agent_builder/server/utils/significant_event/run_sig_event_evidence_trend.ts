/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PIPE_COMMANDS_TO_STRIP = /\|\s*(?:KEEP|SORT|LIMIT|EVAL)\b[^|]*/gi;
const NOW_MINUS_PATTERN = /NOW\s*\(\s*\)\s*-\s*\d+\s*(?:minutes?|hours?|days?|seconds?|weeks?)/gi;
const NOW_PATTERN = /NOW\s*\(\s*\)/gi;

function buildTrendEsql(
  evidenceEsql: string,
  rangeFrom: string,
  rangeTo: string,
  bucketMinutes: number
): string {
  let query = evidenceEsql.replace(PIPE_COMMANDS_TO_STRIP, '');

  query = query.replace(NOW_MINUS_PATTERN, `"${rangeFrom}"`);
  query = query.replace(NOW_PATTERN, `"${rangeTo}"`);

  query = query.replace(/\s+/g, ' ').trim();

  if (query.endsWith('|')) {
    query = query.slice(0, -1).trim();
  }

  return `${query} | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${bucketMinutes} minutes) | SORT bucket ASC`;
}

export interface EvidenceTrendLensConfig {
  success: true;
  lensConfig: Record<string, unknown>;
}

export interface EvidenceTrendLensError {
  success: false;
  error: string;
}

export type EvidenceTrendLensResult = EvidenceTrendLensConfig | EvidenceTrendLensError;

export function buildEvidenceTrendLensConfig({
  evidenceEsql,
  rangeFrom,
  rangeTo,
  bucketMinutes,
}: {
  evidenceEsql: string;
  rangeFrom: string;
  rangeTo: string;
  bucketMinutes: number;
}): EvidenceTrendLensResult {
  const trendEsql = buildTrendEsql(evidenceEsql, rangeFrom, rangeTo, bucketMinutes);

  return {
    success: true,
    lensConfig: {
      type: 'xy',
      layers: [
        {
          type: 'bar',
          data_source: { type: 'esql', query: trendEsql },
          y: [{ column: 'count' }],
          x: { column: 'bucket' },
        },
      ],
      legend: { visibility: 'hidden' },
      axis: {
        x: { grid: { visible: false }, title: { visible: false } },
        y: { grid: { visible: false }, title: { visible: false } },
      },
    },
  };
}
