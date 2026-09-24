/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  injectMetadataIndex,
  prepareEsqlForExecute,
  rewriteLimit,
} from './prepare_esql_for_execute';

describe('injectMetadataIndex', () => {
  it('returns injection when METADATA is absent', () => {
    expect(
      injectMetadataIndex('FROM logs-aws.*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10')
    ).toBe('FROM logs-aws.* METADATA _index | WHERE event.action == "AssumeRole" | LIMIT 10');
  });

  it('returns no double-injection when _index is already present', () => {
    expect(injectMetadataIndex('FROM logs-aws.* METADATA _index | WHERE true | LIMIT 5')).toBe(
      'FROM logs-aws.* METADATA _index | WHERE true | LIMIT 5'
    );
  });

  it('returns _index appended to an existing METADATA list', () => {
    expect(injectMetadataIndex('FROM logs-* METADATA _id | LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index | LIMIT 1'
    );
  });

  it('returns _index appended to KEEP when KEEP would drop it', () => {
    expect(injectMetadataIndex('FROM logs-* | KEEP host.name | LIMIT 5')).toBe(
      'FROM logs-* METADATA _index | KEEP host.name, _index | LIMIT 5'
    );
  });
});

describe('rewriteLimit', () => {
  it('returns rewritten LIMIT when one is present', () => {
    expect(rewriteLimit('FROM logs-* | WHERE true | LIMIT 100', 25)).toBe(
      'FROM logs-* | WHERE true | LIMIT 25'
    );
  });

  it('returns appended LIMIT when none is present', () => {
    expect(rewriteLimit('FROM logs-* | WHERE true', 25)).toBe(
      'FROM logs-* | WHERE true\n| LIMIT 25'
    );
  });

  it('returns a single LIMIT rather than appending a second', () => {
    expect(rewriteLimit('FROM logs-* | LIMIT 0', 50)).toBe('FROM logs-* | LIMIT 50');
  });
});

describe('prepareEsqlForExecute', () => {
  it('returns METADATA injection and LIMIT rewrite together', () => {
    expect(
      prepareEsqlForExecute(
        'FROM logs-aws.cloudtrail-*\n| WHERE aws.cloudtrail.event_name == "AssumeRole"\n| KEEP host.name, user.name\n| LIMIT 100',
        25
      )
    ).toBe(
      'FROM logs-aws.cloudtrail-* METADATA _index | WHERE aws.cloudtrail.event_name == "AssumeRole" | KEEP host.name, user.name, _index | LIMIT 25'
    );
  });
});
