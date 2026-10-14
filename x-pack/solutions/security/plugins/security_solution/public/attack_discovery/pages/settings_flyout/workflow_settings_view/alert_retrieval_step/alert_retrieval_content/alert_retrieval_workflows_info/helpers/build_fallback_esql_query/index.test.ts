/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFallbackEsqlQuery } from '.';

describe('buildFallbackEsqlQuery', () => {
  it('targets the space-specific alerts index when a spaceId is provided', () => {
    const query = buildFallbackEsqlQuery({ spaceId: 'my-space' });

    expect(query).toContain('FROM .alerts-security.alerts-my-space');
  });

  it('falls back to the default space when no spaceId is provided', () => {
    const query = buildFallbackEsqlQuery({});

    expect(query).toContain('FROM .alerts-security.alerts-default');
  });

  it('includes the _id metadata directive', () => {
    const query = buildFallbackEsqlQuery({ spaceId: 'default' });

    expect(query).toContain('METADATA _id');
  });

  it('limits the results', () => {
    const query = buildFallbackEsqlQuery({ spaceId: 'default' });

    expect(query).toContain('| LIMIT 100');
  });

  it('filters for open and acknowledged alerts', () => {
    const query = buildFallbackEsqlQuery({ spaceId: 'default' });

    expect(query).toContain('| WHERE kibana.alert.workflow_status IN ("open", "acknowledged")');
  });
});
