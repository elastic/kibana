/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mobileCrashesDiscoverEsql,
  mobilePanelDiscoverEsql,
  mobileSessionDiscoverEsql,
} from './discover';

describe('mobilePanelDiscoverEsql', () => {
  it('writes the filters and the environment into the query, as Discover takes no params', () => {
    const query = mobilePanelDiscoverEsql(
      { serviceName: 'a"b\nc', osName: 'Android', release: '2.0.0' },
      { environment: 'production' }
    );

    expect(query).toContain('`service.name` == "a\\"b\\nc"');
    expect(query).toContain('`resource.attributes.os.name` == "Android"');
    expect(query).toContain('`service.version` == "2.0.0"');
    expect(query).toContain('`service.environment` == "production"');
    expect(query).not.toMatch(/\?(?!_tstart|_tend)/);
  });

  it("keeps Discover's time range without the event at its end, as the panel does", () => {
    const query = mobilePanelDiscoverEsql({ serviceName: 'shop-mobile' }, {});

    expect(query).toContain('@timestamp >= ?_tstart AND @timestamp < ?_tend');
  });

  it('opens the events, newest first, not aggregates, so each crash and stack trace can be read', () => {
    const query = mobilePanelDiscoverEsql({ serviceName: 'shop-mobile' }, {});

    expect(query).not.toMatch(/\bSTATS\b/);
    expect(query).not.toMatch(/\bBUCKET\(/);
    expect(query).not.toMatch(/\bKEEP\b|\bDROP\b|\bLIMIT\b/);
    expect(query.trim()).toMatch(/\| SORT @timestamp DESC$/);
  });

  it('only reads the mobile documents of the application', () => {
    const query = mobilePanelDiscoverEsql({ serviceName: 'shop-mobile' }, {});

    expect(query).toMatch(
      /^SET unmapped_fields = "nullify";\s*FROM traces-\*\.otel-\*, logs-\*\.otel-\*/
    );
    expect(query).toContain('`service.name` == "shop-mobile"');
  });
});

describe('mobileCrashesDiscoverEsql', () => {
  const esql = mobileCrashesDiscoverEsql(
    { serviceName: 'ride-ios', osName: 'iOS', release: '8.4.0' },
    { environment: 'production' }
  );

  it("filters `observed_timestamp` as Discover's time field, over the tab's range", () => {
    // Discover filters the column first compared with `?_tstart` on its own range: when the SDK
    // observed the crash, which EDOT iOS sets to the crash's time, whenever it is sent.
    expect(esql).toContain(
      'WHERE observed_timestamp >= ?_tstart AND observed_timestamp < ?_tend AND @timestamp >= ?_tstart AND @timestamp < TO_DATETIME(?_tend) + 24 hours AND crash_time >= ?_tstart AND crash_time < ?_tend'
    );
    expect(esql).not.toContain('crash_start');
    expect(esql).toContain('SORT crash_time DESC');
  });

  it('filters on the release that crashed, with the values written into the text', () => {
    expect(esql).toContain('WHERE crash_release == "8.4.0"');
    expect(esql).not.toContain('`service.version` == "8.4.0"');
    expect(esql).toContain('`resource.attributes.os.name` == "iOS"');
    expect(esql).toContain('`service.environment` == "production"');
  });
});

describe('mobileSessionDiscoverEsql', () => {
  it("opens a session's events, oldest first, whatever the case of its id", () => {
    const query = mobileSessionDiscoverEsql({ serviceName: 'ride-ios', sessionId: 'Df831c22' });

    expect(query).toContain('`service.name` == "ride-ios"');
    // EDOT iOS writes `session.id` in uppercase; the crash may have it in another case.
    expect(query).toContain('`attributes.session.id` IN ("Df831c22", "df831c22", "DF831C22")');
    expect(query).not.toMatch(/\?\w/);
    expect(query.trim()).toMatch(/\| SORT @timestamp ASC$/);
  });
});
