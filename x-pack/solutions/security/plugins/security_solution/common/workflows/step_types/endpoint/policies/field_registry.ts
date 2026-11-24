/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIELD_REGISTRY_KINDS = [
  'protection',
  'event',
  'popup',
  'advanced',
  'logging',
  'meta',
  'other',
] as const;
export const FIELD_REGISTRY_SOURCES = ['factory', 'advanced_schema', 'both'] as const;
export const FIELD_REGISTRY_TIERS = [1, 2] as const;

export type FieldRegistryKind = (typeof FIELD_REGISTRY_KINDS)[number];
export type FieldRegistrySource = (typeof FIELD_REGISTRY_SOURCES)[number];
export type FieldRegistryTier = (typeof FIELD_REGISTRY_TIERS)[number];
