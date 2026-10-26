/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the stages that keep only the groups whose main entity passes the entity filters, for
 * rows already grouped by `effective_id`. Filtering each member before grouping would drop an
 * alias's alert or anomaly when only the main entity passes. Without filters there is nothing to
 * join.
 */
export const buildGroupFilterSteps = (
  entitiesIndexName: string,
  entityFilterClauses: string[]
): string[] =>
  entityFilterClauses.length === 0
    ? []
    : [
        '| EVAL entity.id = effective_id',
        `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
        ...entityFilterClauses,
      ];
