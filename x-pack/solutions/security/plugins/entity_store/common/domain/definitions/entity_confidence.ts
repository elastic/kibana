/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Allowed values for `entity.confidence` runtime field. */
export const ENTITY_CONFIDENCE = {
  High: 'high',
  Medium: 'medium',
} as const;

export type EntityConfidence = (typeof ENTITY_CONFIDENCE)[keyof typeof ENTITY_CONFIDENCE];
