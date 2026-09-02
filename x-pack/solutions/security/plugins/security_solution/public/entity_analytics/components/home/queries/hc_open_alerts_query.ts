/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Space-unaware — all spaces share the default alert tier.
export const ALERTS_INDEX = '.alerts-security.alerts-default';

// Derives entity.name and entity.EngineMetadata.Type from alert fields so the
// LOOKUP JOIN keys match the entity-latest index schema.
export const buildHcOpenAlertsQuery = (entityLatestIndex: string): string =>
  [
    `FROM ${ALERTS_INDEX}`,
    `| WHERE kibana.alert.workflow_status == "open"`,
    `| EVAL \`entity.name\` = COALESCE(user.name, host.name, service.name),`,
    `       \`entity.EngineMetadata.Type\` = CASE(`,
    `         user.name IS NOT NULL, "user",`,
    `         host.name IS NOT NULL, "host",`,
    `         "service"`,
    `       )`,
    `| WHERE \`entity.name\` IS NOT NULL`,
    `| LOOKUP JOIN ${entityLatestIndex} ON \`entity.name\`, \`entity.EngineMetadata.Type\``,
    `| WHERE entity.risk.calculated_level IN ("High", "Critical")`,
    `| STATS value = COUNT_DISTINCT(entity.id)`,
  ].join('\n');
