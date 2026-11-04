/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_STACKTRACE, errorsSearch } from './search_request';

const PARAMS = { serviceName: 'shop', start: 1000, end: 2000 };

/** A request body navigated by property, without describing every aggregation. */
interface Aggs {
  [key: string]: Aggs;
}

const aggsOf = (params = PARAMS) => {
  return errorsSearch(params).aggs as Aggs;
};

describe('errorsSearch', () => {
  it('searches the exceptions of the application in the local OTel logs', () => {
    const request = errorsSearch(PARAMS);
    const { filter } = (request.query as Aggs).bool;

    expect(request).toMatchObject({ index: 'logs-*.otel-*', size: 0, ignore_unavailable: true });
    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(filter).toContainEqual({ term: { event_name: 'exception' } });
  });

  it('lists every environment for the picker and filters the groups to the selected one', () => {
    const aggs = aggsOf({ ...PARAMS, environment: 'production' } as typeof PARAMS);

    expect(aggs.environments).toBeDefined();
    expect(aggs.environmentNotDefined).toBeDefined();
    expect(JSON.stringify(aggs.inEnvironment.filter)).toContain('production');
  });

  it('groups the errors by type and stack trace, never by message', () => {
    const { groups } = aggsOf().inEnvironment.aggs;

    expect(groups.multi_terms).toEqual({
      terms: [
        { field: 'exception.type' },
        { field: 'exception.stacktrace', missing: NO_STACKTRACE },
      ],
      size: 10,
    });
    expect(JSON.stringify(errorsSearch(PARAMS))).not.toContain('"field":"exception.message"}');
  });

  it('gives each group its latest message and last occurrence', () => {
    const groupAggs = aggsOf().inEnvironment.aggs.groups.aggs;

    expect(groupAggs.message.top_hits).toMatchObject({ size: 1, fields: ['exception.message'] });
    expect(groupAggs.lastSeen).toEqual({ max: { field: '@timestamp' } });
  });
});
