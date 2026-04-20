/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { EntityType } from '@kbn/entity-store/common';

interface EsHit {
  _source: Record<string, FieldValue>;
}

interface SourceDoc {
  [key: string]: FieldValue;
}

type FieldValue = string | number | string[] | null | undefined;

const ENTITY_NAME_FIELD: Record<EntityType, string> = {
  user: 'user.name',
  host: 'host.name',
  service: 'service.name',
  generic: 'entity.name',
};

const hasEsSource = (d: EsHit | SourceDoc): d is EsHit =>
  '_source' in d && typeof (d as EsHit)._source === 'object';

const unwrap = (doc: EsHit | SourceDoc): SourceDoc => (hasEsSource(doc) ? doc._source : doc);

const toStringOrUndefined = (v: FieldValue): string | undefined => {
  if (!v) return undefined;
  if (Array.isArray(v)) return v[0] != null && v[0] !== '' ? String(v[0]) : undefined;
  if (typeof v === 'object') return undefined;
  return String(v);
};

export const getEntityNameFromDoc = (
  entityType: EntityType,
  doc: EsHit | SourceDoc
): string | undefined => {
  const source = unwrap(doc);
  const field = ENTITY_NAME_FIELD[entityType];
  const value = get(source, field);
  return toStringOrUndefined(value);
};
