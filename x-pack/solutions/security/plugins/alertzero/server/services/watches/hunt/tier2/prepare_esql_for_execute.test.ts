/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prepareEsqlForExecute } from './prepare_esql_for_execute';

describe('prepareEsqlForExecute', () => {
  it('returns _id and _index injected when METADATA is absent', () => {
    expect(
      prepareEsqlForExecute('FROM logs-aws.*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10')
    ).toBe(
      'FROM logs-aws.* METADATA _id, _index\n| WHERE event.action == "AssumeRole"\n| LIMIT 10'
    );
  });

  it('returns no double-injection when both fields are already present', () => {
    expect(
      prepareEsqlForExecute('FROM logs-aws.* METADATA _id, _index | WHERE true | LIMIT 5')
    ).toBe('FROM logs-aws.* METADATA _id, _index\n| WHERE TRUE\n| LIMIT 5');
  });

  it('returns missing METADATA fields appended to an existing list', () => {
    expect(prepareEsqlForExecute('FROM logs-* METADATA _id | LIMIT 1')).toBe(
      'FROM logs-* METADATA _id, _index\n| LIMIT 1'
    );
    expect(prepareEsqlForExecute('FROM logs-* METADATA _index | LIMIT 1')).toBe(
      'FROM logs-* METADATA _index, _id\n| LIMIT 1'
    );
  });

  it('returns _id and _index appended to KEEP when KEEP would drop them', () => {
    expect(prepareEsqlForExecute('FROM logs-* | KEEP host.name | LIMIT 5')).toBe(
      'FROM logs-* METADATA _id, _index\n| KEEP host.name, _id, _index\n| LIMIT 5'
    );
  });

  it('returns every pre-aggregation KEEP rewritten, not only the first', () => {
    expect(
      prepareEsqlForExecute('FROM logs-* | KEEP host.name, user.name | WHERE true | KEEP host.name')
    ).toBe(
      'FROM logs-* METADATA _id, _index\n| KEEP host.name, user.name, _id, _index\n| WHERE TRUE\n| KEEP host.name, _id, _index'
    );
  });

  it('returns a wildcard KEEP unchanged', () => {
    expect(prepareEsqlForExecute('FROM logs-* | KEEP * | LIMIT 5')).toBe(
      'FROM logs-* METADATA _id, _index\n| KEEP *\n| LIMIT 5'
    );
  });

  it('returns a pipe inside a string literal untouched', () => {
    expect(
      prepareEsqlForExecute('FROM logs-* | WHERE process.command_line == "cat /etc/passwd | nc"')
    ).toBe(
      'FROM logs-* METADATA _id, _index\n| WHERE process.command_line == "cat /etc/passwd | nc"'
    );
  });

  it('returns a KEEP after STATS unchanged, since aggregate output has no METADATA columns', () => {
    expect(
      prepareEsqlForExecute(
        'FROM logs-*\n| KEEP user.name, event.action\n| STATS c = COUNT(*) BY user.name\n| KEEP user.name, c\n| LIMIT 10'
      )
    ).toBe(
      'FROM logs-* METADATA _id, _index\n| KEEP user.name, event.action, _id, _index\n| STATS c = COUNT(*) BY user.name\n| KEEP user.name, c\n| LIMIT 10'
    );
  });

  it('returns KEEP after a DROP of a METADATA column unchanged', () => {
    expect(prepareEsqlForExecute('FROM logs-* | DROP _id | KEEP host.name')).toBe(
      'FROM logs-* METADATA _id, _index\n| DROP _id\n| KEEP host.name'
    );
  });

  it('returns the input unchanged when it does not parse', () => {
    const broken = 'FROM logs-* | WHERE ((';
    expect(prepareEsqlForExecute(broken)).toBe(broken);
  });

  it('returns the input unchanged when it does not start with FROM', () => {
    const rowQuery = 'ROW a = 1';
    expect(prepareEsqlForExecute(rowQuery)).toBe(rowQuery);
  });
});
