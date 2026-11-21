/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const keyword: MappingProperty = { type: 'keyword', ignore_above: 1024 };
const date: MappingProperty = { type: 'date' };
const text: MappingProperty = { type: 'text' };

const keywords = (...names: string[]): Record<string, MappingProperty> =>
  Object.fromEntries(names.map((name) => [name, keyword]));

/** Strict, so Elasticsearch rejects a document carrying an unmapped field. */
export const knowledgeMappings: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    native_vuln_scanner: { properties: keywords('knowledge_id') },
    ...keywords('kind', 'source'),
    os: { properties: keywords('family', 'version') },
    vulnerability: { properties: { ...keywords('id'), description: text } },
    impact: text,
    solution: text,
    workaround: text,
    advisory: {
      properties: {
        ...keywords('id', 'url', 'severity', 'cves'),
        title: text,
        summary: text,
      },
    },
    references: keyword,
    published: date,
    vendor_modified: date,
    feed_snapshot_time: date,
    last_seen_in_feed: date,
    ...keywords('content_hash', 'attribution', 'license', 'license_url', 'source_url'),
    modified: { type: 'boolean' },
  },
};
