/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMvExpandUsage } from './get_mv_expand_usage';

describe('getMvExpandUsage', () => {
  it('returns hasMvExpand false if mv_expand not present', () => {
    expect(getMvExpandUsage([], 'from auditbeat*')).toEqual({
      hasMvExpand: false,
    });
  });

  it('returns hasMvExpand true if mv_expand present', () => {
    expect(getMvExpandUsage([], 'from auditbeat* | mv_expand agent.name')).toHaveProperty(
      'hasMvExpand',
      true
    );
  });

  it('returns all expended fields if they present in response columns', () => {
    const columns = [
      { name: 'agent.name', type: 'keyword' as const },
      { name: 'host.name', type: 'keyword' as const },
    ];
    expect(
      getMvExpandUsage(columns, 'from auditbeat* | mv_expand agent.name |  mv_expand host.name')
    ).toHaveProperty('expandedFieldsInResponse', ['agent.name', 'host.name']);
  });

  it('returns empty expended fields if at least one is missing in response columns', () => {
    const columns = [{ name: 'agent.name', type: 'keyword' as const }];
    expect(
      getMvExpandUsage(columns, 'from auditbeat* | mv_expand agent.name |  mv_expand host.name')
    ).toHaveProperty('expandedFieldsInResponse', []);
  });
});
