/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEsqlResultInSource } from './merge_esql_result_in_source';

describe('mergeEsqlResultInSource', () => {
  it('ES|QL field should overwrite nested object field', () => {
    const source = {
      agent: { name: 'test-1' },
    };
    const esqlResult = { 'agent.name': 'custom ES|QL' };

    expect(mergeEsqlResultInSource(source, esqlResult)).toEqual({ 'agent.name': 'custom ES|QL' });
  });
  it('ES|QL field should overwrite flattened object field', () => {
    const source = { 'agent.name': 'test-1' };
    const esqlResult = { 'agent.name': 'custom ES|QL' };

    expect(mergeEsqlResultInSource(source, esqlResult)).toEqual({ 'agent.name': 'custom ES|QL' });
  });
  it('ES|QL field should overwrite mixed notation object field', () => {
    const source = { 'log.syslog': { hostname: 'host-1' } };
    const esqlResult = { 'log.syslog.hostname': 'esql host' };

    expect(mergeEsqlResultInSource(source, esqlResult)).toEqual({
      'log.syslog.hostname': 'esql host',
    });
  });
  it('ES|QL field should be merged into source', () => {
    const source = { agent: { hostname: 'host-1' } };
    const esqlResult = { 'log.syslog.hostname': 'esql host' };

    expect(mergeEsqlResultInSource(source, esqlResult)).toEqual({
      agent: { hostname: 'host-1' },
      'log.syslog.hostname': 'esql host',
    });
  });

  it('ES|QL field should be merged into source without dropping any existing fields', () => {
    const source = { 'log.syslog': { hostname: 'host-1', other: 'other' } };
    const esqlResult = { 'log.syslog.hostname': 'esql host' };

    expect(mergeEsqlResultInSource(source, esqlResult)).toEqual({
      'log.syslog': { other: 'other' },
      'log.syslog.hostname': 'esql host',
    });
  });
});
