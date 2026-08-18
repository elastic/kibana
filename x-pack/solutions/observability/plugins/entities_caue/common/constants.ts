/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_ID = 'entities_caue';
export const APP_ROUTE = `/app/${APP_ID}`;

// Index name: entities-<dataset>-<namespace>. Inlined to avoid a runtime bundle
// dependency on the entityStore plugin. Update if the dataset or namespace changes.
const ENTITIES_LATEST_INDEX = 'entities-latest-default';

export const SERVICE_ENTITIES_QUERY = `FROM ${ENTITIES_LATEST_INDEX}
| WHERE entity.type == "Service"
| KEEP entity.id, entity.name, service.environment, service.version, service.type, entity.lifecycle.first_seen, entity.lifecycle.last_seen, entity.source, service.health.calculated_level, service.health.calculated_score_norm`;
