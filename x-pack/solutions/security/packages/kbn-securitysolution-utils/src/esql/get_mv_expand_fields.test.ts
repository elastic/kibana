/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMvExpandFields } from './get_mv_expand_fields';

describe('getMvExpandFields', () => {
  it('returns empty array if MV_EXPAND not used', () => {
    expect(getMvExpandFields('from auditbeat*')).toEqual([]);
  });
  it('returns single item array if MV_EXPAND used once', () => {
    expect(getMvExpandFields('from auditbeat* | mv_expand agent.name')).toEqual(['agent.name']);
  });
  it('returns array of fields if MV_EXPAND used twice', () => {
    expect(
      getMvExpandFields('from auditbeat* | mv_expand agent.name | mv_expand host.name')
    ).toEqual(['agent.name', 'host.name']);
  });
});
