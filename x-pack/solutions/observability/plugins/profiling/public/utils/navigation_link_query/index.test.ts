/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { getNavigationLinkQuery, withNavigationLinkQuery } from '.';

describe('getNavigationLinkQuery', () => {
  it('reads the search query and schema', () => {
    expect(
      getNavigationLinkQuery('?rangeFrom=now-15m&kuery=host.name%3A%22my%20host%22&schema=otel')
    ).toEqual({ kuery: 'host.name:"my host"', schema: ProfilingSchema.OTEL });
  });

  it.each([
    ['there are none', ''],
    ['the search query is empty', '?kuery='],
    ['the schema is unknown', '?schema=semconv'],
  ])('keeps nothing when %s', (_description, search) => {
    expect(getNavigationLinkQuery(search)).toEqual({ kuery: undefined, schema: undefined });
  });
});

describe('withNavigationLinkQuery', () => {
  it('keeps the path when there is nothing to keep', () => {
    expect(withNavigationLinkQuery('/flamegraphs', {})).toBe('/flamegraphs');
  });

  it.each(Object.values(ProfilingSchema))('adds the %s schema', (schema) => {
    expect(withNavigationLinkQuery('/flamegraphs', { schema })).toBe(
      `/flamegraphs?schema=${schema}`
    );
  });

  it('adds the encoded search query and the schema', () => {
    const path = withNavigationLinkQuery('/functions', {
      kuery: 'host.name:"my host"',
      schema: ProfilingSchema.ECS,
    });

    expect(path).toBe('/functions?kuery=host.name%3A%22my+host%22&schema=ecs');
    expect(getNavigationLinkQuery(path.slice(path.indexOf('?')))).toEqual({
      kuery: 'host.name:"my host"',
      schema: ProfilingSchema.ECS,
    });
  });
});
