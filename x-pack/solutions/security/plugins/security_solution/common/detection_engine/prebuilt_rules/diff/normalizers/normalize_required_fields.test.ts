/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredField } from '../../../../api/detection_engine/model/rule_schema';
import { normalizeRequiredFields } from './normalize_required_fields';

describe('normalizeRequiredFields', () => {
  it('returns an empty array when required fields are undefined', () => {
    expect(normalizeRequiredFields(undefined)).toEqual([]);
  });

  it('sorts required fields by name and type', () => {
    expect(
      normalizeRequiredFields([
        { name: 'user.name', type: 'keyword' },
        { name: 'host.name', type: 'text' },
        { name: 'host.name', type: 'keyword' },
      ])
    ).toEqual([
      { name: 'host.name', type: 'keyword', ecs: true },
      { name: 'host.name', type: 'text', ecs: false },
      { name: 'user.name', type: 'keyword', ecs: true },
    ]);
  });

  it('removes duplicates by name and type', () => {
    expect(
      normalizeRequiredFields([
        { name: 'host.name', type: 'keyword' },
        { name: 'host.name', type: 'keyword' },
      ])
    ).toEqual([{ name: 'host.name', type: 'keyword', ecs: true }]);
  });

  it('recalculates "ecs" from name and type', () => {
    const requiredFieldsWithStaleEcs: RequiredField[] = [
      { name: 'host.name', type: 'keyword', ecs: false },
      { name: 'custom.field', type: 'keyword', ecs: true },
    ];

    expect(normalizeRequiredFields(requiredFieldsWithStaleEcs)).toEqual([
      { name: 'custom.field', type: 'keyword', ecs: false },
      { name: 'host.name', type: 'keyword', ecs: true },
    ]);
  });
});
