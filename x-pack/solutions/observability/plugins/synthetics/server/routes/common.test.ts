/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectKqlFilter, parseArrayFilters, QuerySchema } from './common';

describe('common utils', () => {
  it('tests parseArrayFilters', () => {
    const filters = parseArrayFilters({
      configIds: ['1 4', '2 6', '5'],
    });
    expect(filters.filtersStr).toMatchInlineSnapshot(
      `"synthetics-monitor-multi-space.attributes.config_id:(\\"1 4\\" OR \\"2 6\\" OR \\"5\\")"`
    );
  });
  it('tests parseArrayFilters with tags and configIds', () => {
    const filters = parseArrayFilters({
      configIds: ['1', '2'],
      tags: ['tag1', 'tag2'],
    });
    expect(filters.filtersStr).toMatchInlineSnapshot(
      `"synthetics-monitor-multi-space.attributes.tags:(\\"tag1\\" OR \\"tag2\\") AND synthetics-monitor-multi-space.attributes.config_id:(\\"1\\" OR \\"2\\")"`
    );
  });
  it('tests parseArrayFilters with all options', () => {
    const filters = parseArrayFilters({
      configIds: ['1', '2'],
      tags: ['tag1', 'tag2'],
      locations: ['loc1', 'loc2'],
      monitorTypes: ['type1', 'type2'],
      projects: ['project1', 'project2'],
      monitorQueryIds: ['query1', 'query2'],
      schedules: ['schedule1', 'schedule2'],
    });
    expect(filters.filtersStr).toMatchInlineSnapshot(
      `"synthetics-monitor-multi-space.attributes.tags:(\\"tag1\\" OR \\"tag2\\") AND synthetics-monitor-multi-space.attributes.project_id:(\\"project1\\" OR \\"project2\\") AND synthetics-monitor-multi-space.attributes.type:(\\"type1\\" OR \\"type2\\") AND synthetics-monitor-multi-space.attributes.locations.id:(\\"loc1\\" OR \\"loc2\\") AND synthetics-monitor-multi-space.attributes.schedule.number:(\\"schedule1\\" OR \\"schedule2\\") AND synthetics-monitor-multi-space.attributes.id:(\\"query1\\" OR \\"query2\\") AND synthetics-monitor-multi-space.attributes.config_id:(\\"1\\" OR \\"2\\")"`
    );
  });
});

describe('QuerySchema', () => {
  it('coerces query-string numbers and booleans', () => {
    expect(QuerySchema.parse({ page: '2', perPage: '10', internal: 'true' })).toEqual(
      expect.objectContaining({ page: 2, perPage: 10, internal: true })
    );
  });

  it('keeps the string "false" as false (not z.coerce.boolean)', () => {
    expect(QuerySchema.parse({ internal: 'false' }).internal).toBe(false);
  });

  it('defaults missing internal to false', () => {
    expect(QuerySchema.parse({}).internal).toBe(false);
  });

  it('accepts a single filter string or an array', () => {
    expect(QuerySchema.parse({ tags: 'prod' }).tags).toBe('prod');
    expect(QuerySchema.parse({ tags: ['prod', 'us'] }).tags).toEqual(['prod', 'us']);
  });

  it('parses JSON-encoded searchAfter the way config-schema arrayOf did', () => {
    expect(QuerySchema.parse({ searchAfter: '["monitor-1"]' }).searchAfter).toEqual(['monitor-1']);
    expect(QuerySchema.parse({ searchAfter: ['monitor-1'] }).searchAfter).toEqual(['monitor-1']);
  });

  it('rejects a non-JSON searchAfter string', () => {
    expect(QuerySchema.safeParse({ searchAfter: 'monitor-1' }).success).toBe(false);
  });
});

describe('getSavedObjectKqlFilter', () => {
  it('returns empty string if no values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags' })).toBe('');
  });

  it('returns KQL string if values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm' })).toBe(
      'synthetics-monitor-multi-space.attributes.tags:"apm"'
    );
  });

  it('searches at root when specified', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm', searchAtRoot: true })).toBe(
      'tags:"apm"'
    );
  });

  it('handles array values', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['apm', 'synthetics'] })).toBe(
      'synthetics-monitor-multi-space.attributes.tags:("apm" OR "synthetics")'
    );
  });

  it('escapes quotes', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['"apm', 'synthetics'] })).toBe(
      'synthetics-monitor-multi-space.attributes.tags:("\\"apm" OR "synthetics")'
    );
  });
});
