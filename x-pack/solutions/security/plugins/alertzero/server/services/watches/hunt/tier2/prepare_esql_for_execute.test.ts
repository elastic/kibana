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
  it('returns injection of _id and _index when METADATA is absent', () => {
    expect(
      injectMetadataIndex('FROM logs-aws.*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10')
    ).toBe(
      'FROM logs-aws.* METADATA _id, _index\n| WHERE event.action == "AssumeRole"\n| LIMIT 10'
    );
  });

  it('returns no double-injection when both fields are already present', () => {
    expect(injectMetadataIndex('FROM logs-aws.* METADATA _id, _index | WHERE true | LIMIT 5')).toBe(
      'FROM logs-aws.* METADATA _id, _index | WHERE true | LIMIT 5'
    );
  });

  it('returns missing METADATA fields appended to an existing list', () => {
    expect(injectMetadataIndex('FROM logs-* METADATA _id | LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index | LIMIT 1'
    );
    expect(injectMetadataIndex('FROM logs-* METADATA _index | LIMIT 1')).toBe(
      'FROM logs-* METADATA _index, _id | LIMIT 1'
    );
  });

  it('returns _id and _index appended to KEEP when KEEP would drop them', () => {
    expect(injectMetadataIndex('FROM logs-* | KEEP host.name | LIMIT 5')).toBe(
      'FROM logs-* METADATA _id, _index | KEEP host.name, _id, _index | LIMIT 5'
    );
  });

  it('returns METADATA injection when the first pipe has no leading whitespace', () => {
    expect(injectMetadataIndex('FROM logs-*| WHERE true | LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index| WHERE true | LIMIT 1'
    );
  });

  it('returns string literals in the pipeline unchanged', () => {
    expect(injectMetadataIndex('FROM logs-*\n| WHERE message == "hello  world"\n| LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index\n| WHERE message == "hello  world"\n| LIMIT 1'
    );
  });

  it('returns comment lines in the pipeline unchanged', () => {
    expect(injectMetadataIndex('FROM logs-*\n| WHERE true\n// keep me\n| LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index\n| WHERE true\n// keep me\n| LIMIT 1'
    );
  });

  it('returns a KEEP after STATS unchanged, since aggregate output has no METADATA columns', () => {
    expect(
      injectMetadataIndex(
        'FROM logs-*\n| KEEP user.name, event.action\n| STATS c = COUNT(*) BY user.name\n| KEEP user.name, c\n| LIMIT 10'
      )
    ).toBe(
      'FROM logs-* METADATA _id, _index\n| KEEP user.name, event.action, _id, _index\n| STATS c = COUNT(*) BY user.name\n| KEEP user.name, c\n| LIMIT 10'
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
      'FROM logs-aws.cloudtrail-* METADATA _id, _index\n| WHERE aws.cloudtrail.event_name == "AssumeRole"\n| KEEP host.name, user.name, _id, _index\n| LIMIT 25'
    );
  });
});
