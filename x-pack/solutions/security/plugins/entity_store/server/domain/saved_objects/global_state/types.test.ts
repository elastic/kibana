/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KI_AGGREGATION_GROUP_CAP_DEFAULT,
  KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
  KI_PROMOTED_ENTITY_TYPES_DEFAULT,
  KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
  KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT,
} from './constants';
import {
  backfillKnowledgeIndicators,
  backfillKnowledgeIndicatorsPromotion,
  backfillKnowledgeIndicatorsSchemaAliases,
} from './types';

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

describe('backfillKnowledgeIndicatorsPromotion (V4 model migration)', () => {
  it('adds promotion defaults to an existing V3 knowledgeIndicators block', () => {
    const document = {
      attributes: {
        historySnapshot: { status: 'started', frequency: '24h' },
        logsExtraction: { lookbackPeriod: '3h', delay: '1m' },
        knowledgeIndicators: {
          entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
          aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
        },
      },
    };

    const result = backfillKnowledgeIndicatorsPromotion(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
      promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
    });
  });

  it('is idempotent on a V4 document (preserves custom promotion values)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 150,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service'],
        },
      },
    };

    const result = backfillKnowledgeIndicatorsPromotion(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: 150,
      promoteToTypedThreshold: 95,
      promotedEntityTypes: ['service'],
    });
  });

  it('layers correctly on top of backfillKnowledgeIndicators for a pre-V3 document', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
      },
    };

    const v3 = backfillKnowledgeIndicators(document);
    const v4 = backfillKnowledgeIndicatorsPromotion(v3);

    expect(v4.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
      promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
    });
  });

  it('partially backfills when only promotedEntityTypes is missing', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: 95,
          // promotedEntityTypes intentionally missing
        },
      },
    };

    const result = backfillKnowledgeIndicatorsPromotion(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: 200,
      promoteToTypedThreshold: 95,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
    });
  });

  it('preserves a custom promoteToTypedThreshold of null (the explicit-off value)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: null,
          promotedEntityTypes: [],
        },
      },
    };

    const result = backfillKnowledgeIndicatorsPromotion(document);
    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: 200,
      promoteToTypedThreshold: null,
      promotedEntityTypes: [],
    });
  });

  it('tolerates a defensively-missing knowledgeIndicators block (should not throw)', () => {
    // Should never happen post-V3, but defensive: returning a fresh block
    // with promotion defaults is better than throwing mid-migration.
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
      },
    };

    const result = backfillKnowledgeIndicatorsPromotion(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
    });
  });

  it('does not mutate the input document', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
          aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
        },
      },
    };
    const before = JSON.stringify(document);

    backfillKnowledgeIndicatorsPromotion(document);

    expect(JSON.stringify(document)).toEqual(before);
  });
});

describe('backfillKnowledgeIndicatorsSchemaAliases (V5 model migration)', () => {
  it('adds schemaAliasMinConfidence default to a V4 knowledgeIndicators block', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
          aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
          promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
          promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
        },
      },
    };

    const result = backfillKnowledgeIndicatorsSchemaAliases(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
      promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      schemaAliasMinConfidence: KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT,
    });
  });

  it('is idempotent on a V5 document (preserves the existing custom value)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service'],
          schemaAliasMinConfidence: 85,
        },
      },
    };

    const result = backfillKnowledgeIndicatorsSchemaAliases(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: 200,
      promoteToTypedThreshold: 95,
      promotedEntityTypes: ['service'],
      schemaAliasMinConfidence: 85,
    });
  });

  it('preserves an explicit null schemaAliasMinConfidence (the explicit-off value)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: null,
          promotedEntityTypes: [],
          schemaAliasMinConfidence: null,
        },
      },
    };

    const result = backfillKnowledgeIndicatorsSchemaAliases(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: 200,
      promoteToTypedThreshold: null,
      promotedEntityTypes: [],
      schemaAliasMinConfidence: null,
    });
  });

  it('layers correctly across all three migrations starting from a pre-V3 document', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
      },
    };

    const v3 = backfillKnowledgeIndicators(document);
    const v4 = backfillKnowledgeIndicatorsPromotion(v3);
    const v5 = backfillKnowledgeIndicatorsSchemaAliases(v4);

    expect(v5.attributes.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
      promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
      promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      schemaAliasMinConfidence: KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT,
    });
  });

  it('tolerates a defensively-missing knowledgeIndicators block (should not throw)', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
      },
    };

    const result = backfillKnowledgeIndicatorsSchemaAliases(document);

    expect(result.attributes.knowledgeIndicators).toEqual({
      schemaAliasMinConfidence: KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT,
    });
  });

  it('does not mutate the input document', () => {
    const document = {
      attributes: {
        historySnapshot: {},
        logsExtraction: {},
        knowledgeIndicators: {
          entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
          aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
          promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
          promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
        },
      },
    };
    const before = JSON.stringify(document);

    backfillKnowledgeIndicatorsSchemaAliases(document);

    expect(JSON.stringify(document)).toEqual(before);
  });
});
