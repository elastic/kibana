/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { RELEASE_VERSION_PATTERN, withLatestReleases, withReleaseCounts } from './queries';

// `RLIKE` matches the whole value, and the pattern only uses syntax Lucene and JS read alike.
const isRelease = (version: string) => new RegExp(`^${RELEASE_VERSION_PATTERN}$`).test(version);

const toQuery = (compose: typeof withLatestReleases) =>
  compose(esql.from('logs-*')).toRequest().query;

describe('RELEASE_VERSION_PATTERN', () => {
  it.each(['0', '7', '1.2', '0.9.0', '2.10.0', '10.20.30', '1.2.3.4', '2026.11.23'])(
    'compares %s as a version',
    (version) => {
      expect(isRelease(version)).toBe(true);
    }
  );

  it.each([
    ['empty', ''],
    ['a debug build', 'debug'],
    ['a prefixed release', 'v2.1.0'],
    ['an underscore suffix', '1.0.0_rc1'],
    ['a pre-release, which would beat older releases', '3.0.0-beta'],
    ['a numeric pre-release', '1.0.0-01'],
    ['a build', '1.2.3+45'],
    ['a leading zero, which the version type sorts after every release', '1.02'],
    ['a leading zero on the major', '01.2.3'],
    ['an empty part', '1..2'],
    ['a trailing dot', '1.2.'],
    ['a leading dot', '.1.2'],
    ['spaces', ' 1.2.3 '],
    ['a negative number', '-1.2'],
  ])('leaves out %s (%s)', (_, version) => {
    expect(isRelease(version)).toBe(false);
  });
});

describe('withLatestReleases', () => {
  const query = toQuery(withLatestReleases);

  it('leaves out empty releases before anything else', () => {
    expect(query).toContain(
      '| WHERE `service.version` IS NOT NULL AND `service.version` != "" | STATS first_seen'
    );
  });

  it('keeps when each release of each application first showed up', () => {
    expect(query).toContain(
      'STATS first_seen = MIN(@timestamp) BY `service.name`, `service.version`'
    );
  });

  it('compares as versions only the releases that match the pattern', () => {
    expect(query).toContain(
      `CASE(\`service.version\` RLIKE "${RELEASE_VERSION_PATTERN}", TO_VERSION(\`service.version\`), NULL)`
    );
    expect(query).toContain('numeric_release = MAX(numeric_release)');
  });

  it('falls back to the release that first showed up last, per application', () => {
    expect(query).toContain(
      'newest_release = LAST(`service.version`, first_seen) BY `service.name`'
    );
    expect(query).toContain(
      'EVAL latest_release = COALESCE(TO_STRING(numeric_release), newest_release)'
    );
  });

  it('answers one release per application and nothing else', () => {
    expect(query).toMatch(/\| KEEP `service\.name`, latest_release$/);
  });
});

describe('withReleaseCounts', () => {
  it('leaves out empty releases, so the picker never lists one', () => {
    const query = toQuery((composer) => withReleaseCounts(composer, 5));

    expect(query).toContain('WHERE `service.version` IS NOT NULL AND `service.version` != ""');
    expect(query).toMatch(/\| LIMIT 5$/);
  });
});
