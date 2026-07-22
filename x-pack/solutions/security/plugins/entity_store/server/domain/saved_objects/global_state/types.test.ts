/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sparsifyLogExtractionOverrides } from './types';
import { LOG_EXTRACTION_DEFAULTS } from './constants';

type TransformDoc = Parameters<typeof sparsifyLogExtractionOverrides>[0];

const HISTORY_SNAPSHOT = { status: 'started' as const, frequency: '24h' };

const runTransform = (logsExtraction?: Record<string, unknown>) => {
  const doc = {
    id: 'entity-store-global-state-default',
    type: 'entity-store-global-state',
    attributes: { historySnapshot: HISTORY_SNAPSHOT, logsExtraction },
  } as unknown as TransformDoc;
  const context = {} as Parameters<typeof sparsifyLogExtractionOverrides>[1];

  return sparsifyLogExtractionOverrides(doc, context).document.attributes;
};

describe('sparsifyLogExtractionOverrides (global state model version 4 migration)', () => {
  it('drops every field equal to the current default so the store starts tracking defaults', () => {
    // A pre-migration store that never customized anything holds a fully-resolved config.
    const { logsExtraction } = runTransform({ ...LOG_EXTRACTION_DEFAULTS });

    expect(logsExtraction).toEqual({});
  });

  it('keeps only the customized (non-default) values', () => {
    const { logsExtraction } = runTransform({
      ...LOG_EXTRACTION_DEFAULTS,
      frequency: '5m',
      delay: '2m',
    });

    expect(logsExtraction).toEqual({ frequency: '5m', delay: '2m' });
  });

  it('leaves the history snapshot state untouched', () => {
    const { historySnapshot } = runTransform({ ...LOG_EXTRACTION_DEFAULTS, frequency: '5m' });

    expect(historySnapshot).toEqual(HISTORY_SNAPSHOT);
  });

  it('tolerates a document with no logsExtraction attribute', () => {
    const { logsExtraction } = runTransform(undefined);

    expect(logsExtraction).toEqual({});
  });
});
