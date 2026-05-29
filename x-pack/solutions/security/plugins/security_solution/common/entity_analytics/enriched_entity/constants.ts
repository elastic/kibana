/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ENRICHED_ENTITY_INTERNAL_URL = `/internal/entity_analytics/enriched_entity` as const;

export const GET_ENRICHED_ENTITIES_URL = `${ENRICHED_ENTITY_INTERNAL_URL}/list` as const;
