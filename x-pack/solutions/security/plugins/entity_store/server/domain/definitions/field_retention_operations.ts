/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRetentionField } from './entity_schema';

// Mostly copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/field_utils.ts

type Operation = Omit<EntityRetentionField, 'retention'>;

export const collectValues = ({
  destination,
  source,
  fieldHistoryLength = 10,
  mapping = { type: 'keyword' },
  allowAPIUpdate = false,
}: Operation & { fieldHistoryLength?: number }): EntityRetentionField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'collect_values', maxLength: fieldHistoryLength },
  mapping,
  allowAPIUpdate,
});

export const newestValue = ({
  destination,
  mapping = { type: 'keyword' },
  source,
  allowAPIUpdate = false,
}: Operation): EntityRetentionField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_newest_value' },
  mapping,
  allowAPIUpdate,
});

export const oldestValue = ({
  source,
  destination,
  mapping = { type: 'keyword' },
}: Operation): EntityRetentionField => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_oldest_value' },
  mapping,
  allowAPIUpdate: false, // oldest value should never be updated
});
