/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexSettings, MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export const NAMESPACE = 'test';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/** An index of the fixture: how to create it and the documents it holds at `now`. */
export interface FixtureIndex {
  index: string;
  settings?: IndicesIndexSettings;
  aliases?: string[];
  fields: Record<string, MappingProperty>;
  buildDocs: (now: number) => object[];
}

export const KEYWORD: MappingProperty = { type: 'keyword' };
export const DATE: MappingProperty = { type: 'date' };
export const FLOAT: MappingProperty = { type: 'float' };

export const keywordsOf = (fields: readonly string[]): Record<string, MappingProperty> =>
  Object.fromEntries(fields.map((field) => [field, KEYWORD]));

/** Fields the EUID pipelines read from alert and anomaly documents. */
export const EUID_SOURCE_FIELDS = [
  'cloud.provider',
  'data_stream.dataset',
  'event.dataset',
  'event.kind',
  'event.module',
  'host.hostname',
  'host.id',
  'host.name',
  'service.name',
  'user.domain',
  'user.email',
  'user.id',
  'user.name',
];

export const toIsoAgo = (now: number, ms: number): string => new Date(now - ms).toISOString();
