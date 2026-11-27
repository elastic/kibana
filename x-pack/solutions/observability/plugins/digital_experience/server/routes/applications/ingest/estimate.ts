/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The documents an application, or a bucket, has in one index. */
export interface IndexCount {
  index: string;
  docs: number;
}

/** The stored size of an index's primaries and their document count. */
export interface IndexSize {
  bytes: number;
  docs: number;
}

// `.ds-<data stream>-<yyyy.mm.dd>-<generation>`, and `.fs-` for a failure store.
const BACKING_INDEX = /^\.(?:ds|fs)-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/;

/** The data stream of a backing index; any other index stands for itself. */
export const dataStreamOf = (index: string): string => BACKING_INDEX.exec(index)?.[1] ?? index;

/**
 * The average stored bytes per document of each data stream, over the backing indices it has
 * sizes for. Averaging per data stream, not per index, keeps a young write index, not merged yet,
 * from skewing its documents.
 */
export const averageDocumentSizes = (
  sizes: ReadonlyMap<string, IndexSize>
): Map<string, number> => {
  const totals = new Map<string, IndexSize>();
  for (const [index, { bytes, docs }] of sizes) {
    const stream = dataStreamOf(index);
    const total = totals.get(stream) ?? { bytes: 0, docs: 0 };
    totals.set(stream, { bytes: total.bytes + bytes, docs: total.docs + docs });
  }
  const averages = new Map<string, number>();
  for (const [stream, { bytes, docs }] of totals) {
    if (docs > 0) {
      averages.set(stream, bytes / docs);
    }
  }
  return averages;
};

/**
 * The estimated bytes of documents spread over indices, unrounded, so differences of estimates
 * don't add up rounding errors; `null` when none of their data streams has an average, e.g.
 * without the privilege to read their sizes.
 */
export const estimateBytes = (
  counts: readonly IndexCount[],
  averages: ReadonlyMap<string, number>
): number | null => {
  let bytes: number | null = null;
  for (const { index, docs } of counts) {
    const average = averages.get(dataStreamOf(index));
    if (average !== undefined) {
      bytes = (bytes ?? 0) + docs * average;
    }
  }
  return bytes;
};
