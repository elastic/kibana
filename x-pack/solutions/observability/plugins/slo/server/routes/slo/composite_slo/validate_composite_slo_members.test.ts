/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IllegalArgumentError } from '../../../errors';
import { validateCompositeSloMembers } from './create_composite_slo';

describe('validateCompositeSloMembers', () => {
  it('does not throw for valid members with 2 or more entries', () => {
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: 2 },
      ])
    ).not.toThrow();
  });

  it('does not throw for exactly 25 members', () => {
    const members = Array.from({ length: 25 }, (_, i) => ({
      sloId: `slo-${i}`,
      weight: 1,
    }));
    expect(() => validateCompositeSloMembers(members)).not.toThrow();
  });

  it('throws when members array is empty', () => {
    expect(() => validateCompositeSloMembers([])).toThrow(IllegalArgumentError);
    expect(() => validateCompositeSloMembers([])).toThrow(
      'A composite SLO requires at least 2 members, got 0'
    );
  });

  it('throws when only one member is provided', () => {
    expect(() => validateCompositeSloMembers([{ sloId: 'slo-1', weight: 1 }])).toThrow(
      IllegalArgumentError
    );
    expect(() => validateCompositeSloMembers([{ sloId: 'slo-1', weight: 1 }])).toThrow(
      'A composite SLO requires at least 2 members, got 1'
    );
  });

  it('throws when more than 25 members are provided', () => {
    const members = Array.from({ length: 26 }, (_, i) => ({
      sloId: `slo-${i}`,
      weight: 1,
    }));
    expect(() => validateCompositeSloMembers(members)).toThrow(IllegalArgumentError);
    expect(() => validateCompositeSloMembers(members)).toThrow(
      'A composite SLO supports at most 25 members, got 26'
    );
  });

  it('throws when a member has zero weight', () => {
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: 0 },
      ])
    ).toThrow(IllegalArgumentError);
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: 0 },
      ])
    ).toThrow('Member weight must be a positive integer, got 0 for SLO [slo-2]');
  });

  it('throws when a member has negative weight', () => {
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: -3 },
      ])
    ).toThrow(IllegalArgumentError);
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: -3 },
      ])
    ).toThrow('Member weight must be a positive integer, got -3 for SLO [slo-2]');
  });

  it('throws when a member has a fractional weight', () => {
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: 1.5 },
      ])
    ).toThrow(IllegalArgumentError);
    expect(() =>
      validateCompositeSloMembers([
        { sloId: 'slo-1', weight: 1 },
        { sloId: 'slo-2', weight: 1.5 },
      ])
    ).toThrow('Member weight must be a positive integer, got 1.5 for SLO [slo-2]');
  });
});
