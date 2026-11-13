/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const keyword: MappingProperty = { type: 'keyword', ignore_above: 1024 };
const date: MappingProperty = { type: 'date' };

const keywords = (...names: string[]): Record<string, MappingProperty> =>
  Object.fromEntries(names.map((name) => [name, keyword]));

const cvssVendor: MappingProperty = {
  properties: {
    V3Score: { type: 'float' },
    V3Vector: keyword,
    V2Score: { type: 'float' },
    V2Vector: keyword,
  },
};

/** Strict, so a field the doc builder adds without a mapping fails loudly in tests. */
export const findingsMappings: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': date,
    ecs: { properties: keywords('version') },
    event: {
      properties: {
        ...keywords('kind', 'category', 'type', 'id', 'dataset', 'module'),
        created: date,
      },
    },
    data_stream: { properties: keywords('type', 'dataset', 'namespace') },
    observer: { properties: keywords('vendor') },
    resource: { properties: keywords('id', 'name') },
    host: {
      properties: {
        ...keywords('id', 'name'),
        os: { properties: keywords('family', 'version', 'name', 'kernel') },
      },
    },
    package: {
      properties: keywords('name', 'version', 'fixed_version', 'architecture', 'type'),
    },
    vulnerability: {
      properties: {
        ...keywords('id', 'title', 'reference', 'severity', 'cwe', 'classification'),
        ...keywords('enumeration'),
        score: { properties: { base: { type: 'float' }, version: keyword } },
        cvss: { properties: { nvd: cvssVendor, redhat: cvssVendor } },
        description: { type: 'text' },
        published_date: date,
        scanner: { properties: keywords('vendor') },
        data_source: { properties: keywords('ID', 'Name', 'URL') },
      },
    },
    native_vuln_scanner: {
      properties: {
        ...keywords('finding_id', 'kind', 'scheme', 'confidence', 'state', 'run_id'),
        ...keywords('source_package'),
        why: { type: 'text' },
        first_seen: date,
        last_seen: date,
        fixed_at: date,
        feed_snapshot_time: date,
        advisories: {
          properties: keywords('id', 'source', 'definition_id', 'title', 'url', 'severity'),
        },
      },
    },
  },
};
