/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilters } from './filter_monitors';

describe('getFilters', () => {
  it('returns an empty array when all parameters are empty', () => {
    const ruleParams = { monitorTypes: [], locations: [], tags: [], projects: [] };
    expect(getFilters(ruleParams)).toEqual([]);
  });

  it('creates a terms filter for monitorTypes', () => {
    const ruleParams = { monitorTypes: ['http', 'tcp'], locations: [], tags: [], projects: [] };
    expect(getFilters(ruleParams)).toEqual([{ terms: { 'monitor.type': ['http', 'tcp'] } }]);
  });

  it('creates a terms filter for locations', () => {
    const ruleParams = {
      monitorTypes: [],
      locations: ['us-east', 'us-west'],
      tags: [],
      projects: [],
    };
    expect(getFilters(ruleParams)).toEqual([
      { terms: { 'observer.name': ['us-east', 'us-west'] } },
    ]);
  });

  it('creates a bool must filter for tags', () => {
    const ruleParams = { monitorTypes: [], locations: [], tags: ['tag1', 'tag2'], projects: [] };
    expect(getFilters(ruleParams)).toEqual([
      {
        terms: { tags: ['tag1', 'tag2'] },
      },
    ]);
  });

  it('creates a terms filter for projects', () => {
    const ruleParams = { monitorTypes: [], locations: [], tags: [], projects: ['proj1', 'proj2'] };
    expect(getFilters(ruleParams)).toEqual([
      { terms: { 'monitor.project.id': ['proj1', 'proj2'] } },
    ]);
  });

  it('handles all filters together', () => {
    const ruleParams = {
      monitorTypes: ['http'],
      locations: ['us-east'],
      tags: ['tag1', 'tag2'],
      projects: ['proj1'],
    };
    expect(getFilters(ruleParams)).toEqual([
      { terms: { 'monitor.type': ['http'] } },
      { terms: { 'observer.name': ['us-east'] } },
      {
        terms: { tags: ['tag1', 'tag2'] },
      },
      { terms: { 'monitor.project.id': ['proj1'] } },
    ]);
  });

  it('ignores undefined fields', () => {
    const ruleParams = {
      monitorTypes: undefined,
      locations: undefined,
      tags: undefined,
      projects: undefined,
    };
    expect(getFilters(ruleParams)).toEqual([]);
  });

  it('ignores empty values in an otherwise valid object', () => {
    const ruleParams = { monitorTypes: [], locations: ['us-east'], tags: [], projects: [] };
    expect(getFilters(ruleParams)).toEqual([{ terms: { 'observer.name': ['us-east'] } }]);
  });
});
