/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFromExclusions, prepareEsqlForExecute } from './prepare_esql_for_execute';

describe('addFromExclusions', () => {
  it('appends each exclusion to the FROM sources and keeps the rest of the query', () => {
    expect(
      addFromExclusions('FROM logs-aws.cloudtrail-*\n| WHERE true\n| LIMIT 5', [
        '*secret*',
        'logs-elastic_agent*',
      ])
    ).toBe('FROM logs-aws.cloudtrail-*, -*secret*, -logs-elastic_agent*\n| WHERE TRUE\n| LIMIT 5');
  });

  it('keeps METADATA after the sources and does not repeat an exclusion', () => {
    const once = addFromExclusions('FROM a-*, b-* METADATA _id | LIMIT 1', ['*secret*']);

    expect(once).toBe('FROM a-*, b-*, -*secret* METADATA _id\n| LIMIT 1');
    expect(addFromExclusions(once, ['*secret*'])).toBe(once);
  });

  it('returns the query untouched with no exclusions, or when it is not a valid FROM', () => {
    const query = 'FROM logs-* | LIMIT 1';

    expect(addFromExclusions(query, [])).toBe(query);
    expect(addFromExclusions('ROW a = 1', ['*secret*'])).toBe('ROW a = 1');
    expect(addFromExclusions('FROM logs-* |', ['*secret*'])).toBe('FROM logs-* |');
  });
});

describe('prepareEsqlForExecute', () => {
  it('appends exclusions with the METADATA columns', () => {
    expect(
      prepareEsqlForExecute('FROM logs-aws.* | LIMIT 10', { excludedIndices: ['*secret*'] })
    ).toBe('FROM logs-aws.*, -*secret* METADATA _id, _index\n| LIMIT 10');
  });

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
