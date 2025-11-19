/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './common.gen';
export * from './get_entity.gen';
export * from './delete_entity.gen';
export * from './list_entities.gen';
export * from './upsert_entity.gen';

// Re-export Entity type explicitly for better visibility
export type { Entity } from './common.gen';
