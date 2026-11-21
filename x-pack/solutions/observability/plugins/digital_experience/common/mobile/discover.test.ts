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

  it("buckets the KPIs over Discover's time range, which leaves out the event at the end", () => {
    const query = mobilePanelDiscoverEsql({ serviceName: 'shop-mobile' }, {});

    expect(query).toContain('@timestamp >= ?_tstart AND @timestamp < ?_tend');
    expect(query).toContain('BUCKET(@timestamp, 50, ?_tstart, ?_tend)');
  });
});
