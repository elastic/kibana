/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { MAX_ID_LENGTH, type BaseFeature } from '@kbn/significant-events-schema';

export const ENTITY_IDENTITY_FIELDS = ['service.name', 'resource.attributes.service.name'] as const;

const IDENTITY_FIELDS: ReadonlySet<string> = new Set(ENTITY_IDENTITY_FIELDS);

const identityValue = (condition: Condition): string | undefined =>
  'field' in condition &&
  IDENTITY_FIELDS.has(condition.field) &&
  'eq' in condition &&
  typeof condition.eq === 'string'
    ? condition.eq
    : undefined;

// A conjunction pins the entity only when exactly one child names its identity.
const findIdentityValue = (filter: Condition | undefined): string | undefined => {
  if (!filter) return undefined;
  if (!('and' in filter)) return identityValue(filter);
  const values = filter.and.flatMap((child) => identityValue(child) ?? []);
  return values.length === 1 ? values[0] : undefined;
};

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_ID_LENGTH)
    .replace(/-+$/, '');

/** Derives entity slugs from the `service.name` filter so every source names a service the same way. */
export const canonicalizeEntitySlugs = (
  features: BaseFeature[]
): { features: BaseFeature[]; canonicalSlugs: Set<string> } => {
  const canonicalSlugs = new Set<string>();
  const canonicalized = features.map((feature) => {
    if (feature.type !== 'entity') return feature;
    const value = findIdentityValue(feature.filter);
    const slug = value === undefined ? '' : slugify(value);
    if (!slug) return feature;
    canonicalSlugs.add(slug);
    return slug === feature.id ? feature : { ...feature, id: slug };
  });
  return { features: canonicalized, canonicalSlugs };
};
