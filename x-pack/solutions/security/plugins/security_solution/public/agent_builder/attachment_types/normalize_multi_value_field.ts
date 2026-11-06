/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the values of a multi-value entity-store attribute as a list.
 *
 * Some entity attributes are conceptually collections: an entity can be seen in
 * several data sources and can belong to several watchlists. Callers always
 * want to work with these as a list, regardless of whether the entity currently
 * has none, one, or many values — so this is the single place that guarantees a
 * clean `string[]` for any such attribute.
 *
 * (Implementation note: Elasticsearch serializes these attributes as a bare
 * string when the entity has a single value and as an array only when it has
 * multiple. Reading one without normalizing here risks a `.map is not a
 * function` crash on the single-value case.)
 */
export const normalizeMultiValueField = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : typeof value === 'string' && value.length > 0
    ? [value]
    : [];
