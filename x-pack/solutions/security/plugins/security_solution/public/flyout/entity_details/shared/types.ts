/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `single` loads only the record whose `entity.id` matches; `resolved` also loads every record that
 * resolves to that id (the target plus its aliases), so the caller can render the whole resolution group.
 */
export type EntityViewMode = 'single' | 'resolved';
