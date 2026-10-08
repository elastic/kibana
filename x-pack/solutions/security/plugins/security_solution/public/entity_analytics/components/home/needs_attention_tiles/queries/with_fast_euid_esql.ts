/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { getEuidEsqlEvaluation, getFieldEvaluationsEsql } from '../../new_entities_table/euid_esql';

/**
 * The entity store EUID API with its ES|QL derivation swapped for the column-at-a-time copy in
 * `euid_esql.ts`: the same entity ids, several times faster over many alerts or anomalies.
 *
 * TODO: remove once that copy is ported to the entity store generator.
 */
export const getEuidWithFastEsql = (euid: EntityStoreEuid): EntityStoreEuid => ({
  ...euid,
  esql: {
    ...euid.esql,
    getFieldEvaluations: getFieldEvaluationsEsql,
    getEuidEvaluation: getEuidEsqlEvaluation,
  },
});
