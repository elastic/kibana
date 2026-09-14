/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Range element types and the scalar type of their two bounds. Range lists are
 * stored as source docs (authored value, verbatim) plus derived coalesced docs
 * (disjoint bounds). Every other type is stored as a single `value` column whose
 * ES field type equals the list type name (all 23 type names are valid ES field
 * types).
 */
export const RANGE_BOUND_TYPE: Partial<Record<Type, string>> = {
  date_range: 'date',
  double_range: 'double',
  float_range: 'float',
  integer_range: 'integer',
  ip_range: 'ip',
  long_range: 'long',
};

export const isRangeType = (type: Type): boolean => RANGE_BOUND_TYPE[type] != null;

/**
 * Builds the mappings for a per-list lookup index given the list element type.
 */
export const buildLookupMappings = (type: Type): estypes.MappingTypeMapping => {
  const boundType = RANGE_BOUND_TYPE[type];
  if (boundType != null) {
    return {
      dynamic: 'strict',
      properties: {
        // rebuild bookkeeping, carried only by the "__state" doc: coalesced_version
        // records the source version the coalesced set was last built from,
        // source_version is bumped on every source mutation, and status is "dirty"
        // until a rebuild makes the coalesced set current. Retries are bounded by the
        // rebuild task's maxAttempts, not tracked here.
        coalesced_version: { type: 'long' },
        // "source" (authored, verbatim, for export/find/delete) | "coalesced" (joinable)
        // | "state" (the single rebuild bookkeeping doc, _id "__state") | "dirty" (a
        // journaled region the rebuild task must re-coalesce)
        kind: { type: 'keyword' },
        // disjoint bounds on coalesced docs, the join target
        range_end: { type: boundType } as estypes.MappingProperty,
        range_start: { type: boundType } as estypes.MappingProperty,
        source_version: { type: 'long' },
        // parsed bounds on source docs, so a source can be range-queried by the
        // localized insert/delete without reparsing every value. The join never
        // references these, so sources stay invisible to membership.
        src_end: { type: boundType } as estypes.MappingProperty,
        src_start: { type: boundType } as estypes.MappingProperty,
        status: { type: 'keyword' },
        // authored value kept verbatim on source docs, so export round-trips exactly
        value: { type: 'keyword' },
      },
    };
  }

  // Equality / native types: one typed `value` column. The ES field type is the
  // list type name itself (keyword, ip, long, date, boolean, geo_point, ...).
  return {
    dynamic: 'strict',
    properties: {
      value: { type } as estypes.MappingProperty,
    },
  };
};
