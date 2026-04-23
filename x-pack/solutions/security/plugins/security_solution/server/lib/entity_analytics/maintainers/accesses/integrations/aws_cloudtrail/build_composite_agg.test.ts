/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery } from './build_composite_agg';

describe('AWS CloudTrail buildCompositeAggQuery', () => {
  it('filters for AWS module', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({ term: { 'event.module': 'aws' } });
  });

  it('filters for StartSession and SendSSHPublicKey actions', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: { 'event.action': ['StartSession', 'SendSSHPublicKey'] },
    });
  });

  it('does not filter on logon_type or event.provider', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    const providerFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.term?.['event.provider']
    );
    const logonTypeFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.terms?.['process.Ext.session_info.logon_type']
    );
    expect(providerFilter).toBeUndefined();
    expect(logonTypeFilter).toBeUndefined();
  });
});
