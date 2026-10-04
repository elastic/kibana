/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredFieldsDiffAlgorithm } from './required_fields_diff_algorithm';

describe('requiredFieldsDiffAlgorithm (two-way)', () => {
  it('returns true for equal values', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [{ name: 'host.name', type: 'keyword', ecs: true }],
        [{ name: 'host.name', type: 'keyword', ecs: true }]
      )
    ).toBe(true);
  });

  it('returns true when only the order differs', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [
          { name: 'host.name', type: 'keyword', ecs: true },
          { name: 'user.name', type: 'keyword', ecs: true },
        ],
        [
          { name: 'user.name', type: 'keyword', ecs: true },
          { name: 'host.name', type: 'keyword', ecs: true },
        ]
      )
    ).toBe(true);
  });

  it('returns true when only "ecs" differs', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [{ name: 'host.name', type: 'keyword', ecs: true }],
        [{ name: 'host.name', type: 'keyword', ecs: false }]
      )
    ).toBe(true);
  });

  it('returns true when values differ only in duplicates', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [
          { name: 'host.name', type: 'keyword', ecs: true },
          { name: 'host.name', type: 'keyword', ecs: true },
        ],
        [{ name: 'host.name', type: 'keyword', ecs: true }]
      )
    ).toBe(true);
  });

  it('returns true for undefined and an empty array', () => {
    expect(requiredFieldsDiffAlgorithm(undefined, [])).toBe(true);
  });

  it('returns false when "type" differs', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [{ name: 'host.name', type: 'keyword', ecs: true }],
        [{ name: 'host.name', type: 'text', ecs: true }]
      )
    ).toBe(false);
  });

  it('returns false when "name" differs', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [{ name: 'host.name', type: 'keyword', ecs: true }],
        [{ name: 'user.name', type: 'keyword', ecs: true }]
      )
    ).toBe(false);
  });

  it('returns false when a field is added', () => {
    expect(
      requiredFieldsDiffAlgorithm(
        [{ name: 'host.name', type: 'keyword', ecs: true }],
        [
          { name: 'host.name', type: 'keyword', ecs: true },
          { name: 'user.name', type: 'keyword', ecs: true },
        ]
      )
    ).toBe(false);
  });
});
