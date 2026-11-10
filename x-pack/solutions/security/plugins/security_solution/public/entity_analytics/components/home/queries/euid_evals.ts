/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidEsqlEvaluation,
  getFieldEvaluationsEsql,
} from '@kbn/entity-store/common/domain/euid';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { ALLOWED_ENTITY_TYPES } from '../entities_grid/common';

/** `EVAL`s of the user, host and service EUIDs into `user_euid`, `host_euid`, `service_euid`. */
export const buildPerTypeEuidEvals = (): string[] =>
  ALLOWED_ENTITY_TYPES.flatMap((entityType) => {
    const definition = getBuiltInEntityDefinition(entityType);
    const fieldEvals = getFieldEvaluationsEsql(definition);
    return [
      ...(fieldEvals ? [`| EVAL ${fieldEvals}`] : []),
      `| EVAL ${getEuidEsqlEvaluation(definition, `${entityType}_euid`)}`,
    ];
  });

/**
 * ES|QL EVAL that folds `user_euid`, `host_euid`, and `service_euid` into one
 * multi-value column of the ids that are present. `MV_APPEND` returns null if any
 * argument is null, so each argument is a COALESCE that is null only when all three
 * ids are; MV_DEDUPE drops the repeats that come from the fallbacks.
 *
 * A multi-condition CASE would do the same, but ES|QL evaluates it one row at a time,
 * which made this EVAL most of the cost of the alerts tile.
 */
export const evalGuardedTypedEuids = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = MV_DEDUPE(MV_APPEND(MV_APPEND(`,
    '  COALESCE(user_euid, host_euid, service_euid),',
    '  COALESCE(host_euid, service_euid, user_euid)),',
    '  COALESCE(service_euid, user_euid, host_euid)))',
  ].join('\n');

/**
 * Derives the EUIDs of every entity a document names, one row per entity, into `entity.id`: a
 * document can carry several of the user, host and service ids, and counts as an event of each.
 * Anomaly queries use it: ML records do not carry `entity.id`.
 */
export const buildEuidStages = (): string[] => [
  ...buildPerTypeEuidEvals(),
  // A temp column, as the anomalies index maps its own `entity.id`, which must not be grouped on.
  evalGuardedTypedEuids('derived_euids'),
  '| MV_EXPAND derived_euids',
  '| WHERE derived_euids IS NOT NULL',
  '| RENAME derived_euids AS `entity.id`',
];
