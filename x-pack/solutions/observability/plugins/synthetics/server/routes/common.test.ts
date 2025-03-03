/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseArrayFilters } from './common';
import { getSavedObjectKqlFilter } from './common';

describe('common utils', () => {
  it('tests parseArrayFilters', () => {
    const filters = parseArrayFilters({
      configIds: ['1 4', '2 6', '5'],
    });
    expect(filters.filtersStr).toMatchInlineSnapshot(
      `"synthetics-monitor.attributes.config_id:(\\"1 4\\" OR \\"2 6\\" OR \\"5\\")"`
    );
  });
  it('tests parseArrayFilters with tags and configIds', () => {
    const filters = parseArrayFilters({
      configIds: ['1', '2'],
      tags: ['tag1', 'tag2'],
    });
    expect(filters.filtersStr).toMatchInlineSnapshot(
      `"synthetics-monitor.attributes.tags:(\\"tag1\\" OR \\"tag2\\") AND synthetics-monitor.attributes.config_id:(\\"1\\" OR \\"2\\")"`
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
      `"synthetics-monitor.attributes.tags:(\\"tag1\\" OR \\"tag2\\") AND synthetics-monitor.attributes.project_id:(\\"project1\\" OR \\"project2\\") AND synthetics-monitor.attributes.type:(\\"type1\\" OR \\"type2\\") AND synthetics-monitor.attributes.schedule.number:(\\"schedule1\\" OR \\"schedule2\\") AND synthetics-monitor.attributes.id:(\\"query1\\" OR \\"query2\\") AND synthetics-monitor.attributes.config_id:(\\"1\\" OR \\"2\\")"`
    );
  });
});

describe('getSavedObjectKqlFilter', () => {
  it('returns empty string if no values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags' })).toBe('');
  });

  it('returns KQL string if values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm' })).toBe(
      'synthetics-monitor.attributes.tags:"apm"'
    );
  });

  it('searches at root when specified', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm', searchAtRoot: true })).toBe(
      'tags:"apm"'
    );
  });

  it('handles array values', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("apm" OR "synthetics")'
    );
  });

  it('escapes quotes', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['"apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("\\"apm" OR "synthetics")'
    );
  });
});
