/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ALERT_ENTITY_ID_LENGTH,
  MAX_ALERT_ENTITY_NAME_LENGTH,
} from '../../../../common/workflows/step_types/get_alert_entities_step/get_alert_entities_step_common';
import type { FoundAlertEntities } from './types';

/**
 * Merges what each type's aggregation found into the step's output: most-alerted first, ties
 * broken by id, at most `maxEntities`.
 *
 * The attach validates its whole array at once, so one oversized value would take every other
 * entity down with it. An id over the limit is dropped; a name over the limit is dropped and its
 * entity kept, since the id alone still identifies it.
 */
export const boundAlertEntities = ({
  found,
  maxEntities,
}: {
  found: FoundAlertEntities[];
  maxEntities: number;
}): {
  entities: Array<{ id: string; name?: string; type: 'host' | 'service' | 'user' }>;
  total: number;
  truncated: boolean;
} => {
  const total = found.reduce((sum, { total: typeTotal }) => sum + typeTotal, 0);

  const entities = found
    .flatMap(({ entities: typeEntities }) => typeEntities)
    .filter(({ id }) => id.length <= MAX_ALERT_ENTITY_ID_LENGTH)
    .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, maxEntities)
    .map(({ id, name, type }) => ({
      id,
      ...(name != null && name.length <= MAX_ALERT_ENTITY_NAME_LENGTH ? { name } : {}),
      type,
    }));

  return { entities, total, truncated: total > entities.length };
};
