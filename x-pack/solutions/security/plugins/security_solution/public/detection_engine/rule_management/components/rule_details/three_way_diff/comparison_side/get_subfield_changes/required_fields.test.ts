/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSubfieldChangesForRequiredFields } from './required_fields';

describe('getSubfieldChangesForRequiredFields', () => {
  it('returns no changes when values differ only in order and duplicates', () => {
    expect(
      getSubfieldChangesForRequiredFields(
        [
          { name: 'host.name', type: 'keyword', ecs: true },
          { name: 'custom.field', type: 'keyword', ecs: false },
        ],
        [
          { name: 'custom.field', type: 'keyword', ecs: false },
          { name: 'host.name', type: 'keyword', ecs: true },
          { name: 'host.name', type: 'keyword', ecs: true },
        ]
      )
    ).toEqual([]);
  });

  it('renders one sorted field per line with "ecs"', () => {
    expect(
      getSubfieldChangesForRequiredFields(
        [
          { name: 'user.name', type: 'keyword', ecs: true },
          { name: 'host.name', type: 'keyword', ecs: true },
        ],
        [{ name: 'host.name', type: 'keyword', ecs: true }]
      )
    ).toEqual([
      {
        subfieldName: 'required_fields',
        oldSubfieldValue: [
          '[',
          '  { "name": "host.name", "type": "keyword", "ecs": true },',
          '  { "name": "user.name", "type": "keyword", "ecs": true }',
          ']',
        ].join('\n'),
        newSubfieldValue: [
          '[',
          '  { "name": "host.name", "type": "keyword", "ecs": true }',
          ']',
        ].join('\n'),
      },
    ]);
  });

  it('renders an empty array on multiple lines', () => {
    expect(
      getSubfieldChangesForRequiredFields([], [{ name: 'host.name', type: 'keyword', ecs: true }])
    ).toEqual([
      expect.objectContaining({
        oldSubfieldValue: '[\n]',
      }),
    ]);
  });

  it('renders a missing value as an empty string', () => {
    expect(
      getSubfieldChangesForRequiredFields(undefined, [
        { name: 'host.name', type: 'keyword', ecs: true },
      ])
    ).toEqual([
      expect.objectContaining({
        oldSubfieldValue: '',
      }),
    ]);
  });
});
