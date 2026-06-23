/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityField } from './entity_schema';

// Mostly copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/field_utils.ts

type Operation = Omit<EntityField, 'retention' | 'destination'> & {
  destination?: string;
  skipExtraction?: boolean;
};

export const collectValues = ({
  destination,
  source,
  mapping = { type: 'keyword' },
  allowAPIUpdate = false,
  skipExtraction = false,
}: Operation): EntityField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'collect_values' },
  mapping,
  allowAPIUpdate,
  skipExtraction,
});

export const newestValue = ({
  destination,
  mapping = { type: 'keyword' },
  source,
  allowAPIUpdate = false,
  skipExtraction = false,
}: Operation): EntityField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_newest_value' },
  mapping,
  allowAPIUpdate,
  skipExtraction,
});

export const oldestValue = ({
  source,
  destination,
  mapping = { type: 'keyword' },
}: Operation): EntityField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_oldest_value' },
  mapping,
  allowAPIUpdate: false, // oldest value should never be updated
  skipExtraction: false,
});
