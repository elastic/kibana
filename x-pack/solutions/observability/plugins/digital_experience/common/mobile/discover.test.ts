/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobilePanelDiscoverEsql } from './discover';

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
