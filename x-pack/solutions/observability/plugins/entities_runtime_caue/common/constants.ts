/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_ID = 'entities_runtime_caue';
export const APP_ROUTE = `/app/${APP_ID}`;
export const ENTITY_DEFINITION_SO_TYPE = 'runtime-entity-definition';
/**
 * Prefix for per-definition metadata lookup indices.
 * Must be under .entities.* so kibana_system has create_index + manage privilege.
 * Do NOT use a plain `entities-*` prefix — kibana_system only has view_index_metadata there.
 */
export const METADATA_INDEX_PREFIX = '.entities.runtime-caue.metadata';
