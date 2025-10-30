/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// INTERNAL
const INTERNAL_URL = `/internal/entity_details` as const;
export const ENTITY_DETAILS_HIGHLIGH_INTERNAL_URL = `${INTERNAL_URL}/highlights` as const;

// PUBLIC
export const PUBLIC_URL = `/api/entity_details` as const;
