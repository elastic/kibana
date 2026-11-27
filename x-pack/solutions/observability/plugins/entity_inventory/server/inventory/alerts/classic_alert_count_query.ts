/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { GeneratedQuery } from '../generator';
import { ENTITY_ID_COLUMN, resolveIdentityPlan } from '../generator';
import { quoteIdentifier } from '../generator/esql_syntax';
import { assertParses } from '../generator/parse_guard';
import { toClassicAlertDefinition } from './alert_identity';

/**
 * The alert indices of the rule types the Infra pages cover: stack rules (including the ES|QL
 * integration templates) and Observability rules. Security alerts identify entities by
 * `kibana.alert.entity.id`, a different mechanism, and are out of scope.
 */
export const CLASSIC_ALERT_INDICES = '.alerts-stack.*,.alerts-observability.*';

/** The most entity ids one count query returns. Reaching it is reported, not hidden. */
export const MAX_ALERT_COUNT_ROWS = 10_000;

/** The column holding the count of active alerts per entity id. */
export const ALERT_COUNT_COLUMN = 'alerts';

const STATUS = quoteIdentifier('kibana.alert.status');
const SPACE_IDS = quoteIdentifier('kibana.space_ids');
const ALERT_UUID = quoteIdentifier('kibana.alert.uuid');
const ENTITY_ID = quoteIdentifier(ENTITY_ID_COLUMN);

/**
 * Builds the query that counts the active classic alerts of every entity of a type. It reads the
 * values a rule grouped by from `kibana.alert.grouping.*`, computes the entity id from them with
 * the definition's own identity logic and counts distinct alerts per id. One query serves the
 * whole list, so a row's count needs no query of its own.
 *
 * An alert counts for an entity only when its grouping fields reproduce the entity's identity.
 * Throws `InventoryDefinitionError` when the identity cannot be read from an alert.
 */
export const buildClassicAlertCountQuery = (
  definition: EntityDefinitionWithoutId,
  spaceId: string
): GeneratedQuery => {
  const { presenceFilter, idEvaluation } = resolveIdentityPlan(
    toClassicAlertDefinition(definition)
  );
  const esql = [
    'SET unmapped_fields="nullify";',
    `FROM ${CLASSIC_ALERT_INDICES}`,
    `| WHERE ${STATUS} == "active" AND MV_CONTAINS(${SPACE_IDS}, ?spaceId)`,
    `| WHERE ${presenceFilter}`,
    `| EVAL ${idEvaluation}`,
    `| STATS ${ALERT_COUNT_COLUMN} = COUNT_DISTINCT(${ALERT_UUID}) BY ${ENTITY_ID}`,
    `| SORT ${ALERT_COUNT_COLUMN} DESC, ${ENTITY_ID} ASC`,
    `| LIMIT ${MAX_ALERT_COUNT_ROWS}`,
  ].join('\n');
  assertParses(esql);
  return { esql, params: [{ spaceId }] };
};
