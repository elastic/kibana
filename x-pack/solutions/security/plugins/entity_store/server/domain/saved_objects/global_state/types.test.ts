/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KI_AGGREGATION_GROUP_CAP_DEFAULT, KI_ENTITY_MIN_CONFIDENCE_DEFAULT } from './constants';
import { backfillKnowledgeIndicators } from './types';

describe('backfillKnowledgeIndicators (V3 model migration)', () => {
  it('adds platform defaults when knowledgeIndicators is missing', () => {
    const document = {
      attributes: {
        historySnapshot: { status: 'started', frequency: '24h' },
        logsExtraction: { lookbackPeriod: '3h', delay: '1m' },
      },
    };

    const result = backfillKnowledgeIndicators(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
    });
    // existing top-level blocks must be preserved untouched
    expect(result.attributes.historySnapshot).toEqual({ status: 'started', frequency: '24h' });
    expect(result.attributes.logsExtraction).toEqual({ lookbackPeriod: '3h', delay: '1m' });
  });

  it('is idempotent when knowledgeIndicators is already present (does not overwrite custom values)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: { entityMinConfidence: 70, aggregationGroupCap: 50 },
      },
    };

    const result = backfillKnowledgeIndicators(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 70,
      aggregationGroupCap: 50,
    });
  });

  it('also backfills when knowledgeIndicators is explicitly null', () => {
    // Defensive: a buggy upstream writer could land a null block; we treat
    // that the same as missing and replace with defaults.
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: null,
      },
    };

    const result = backfillKnowledgeIndicators(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
    });
  });

  it('does not mutate the input document (returns a new attributes object)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
      },
    };
    const before = JSON.stringify(document);

    backfillKnowledgeIndicators(document);

    expect(JSON.stringify(document)).toEqual(before);
  });
});
