/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { translateSearch } from './kql_to_esql';

const CRITICALITY = 'asset.criticality == "high_impact"';

describe('translateSearch', () => {
  it('reads the same column on both for a field the group query rolls up in place', () => {
    expect(translateSearch('asset.criticality: high_impact')).toEqual({
      own: CRITICALITY,
      group: CRITICALITY,
    });
  });

  it('compares a union with MV_CONTAINS, as == gives null for several values', () => {
    expect(translateSearch('entity.source: okta')?.own).toBe('MV_CONTAINS(entity.source, "okta")');
    expect(translateSearch('entity.attributes.watchlists: vip')?.group).toBe(
      'MV_CONTAINS(entity.attributes.watchlists, "vip")'
    );
  });

  it('reads the name as stored on both, as the row shows the main entity name', () => {
    expect(translateSearch('entity.name: bob')).toEqual({
      own: 'entity.name == "bob"',
      group: 'entity.name == "bob"',
    });
  });

  it('reads a stored group value, or the main entity own when there is none, on the group only', () => {
    expect(translateSearch('entity.risk.calculated_level: High')).toEqual({
      own: 'entity.risk.calculated_level == "High"',
      group:
        'COALESCE(entity.relationships.resolution.risk.calculated_level, entity.risk.calculated_level) == "High"',
    });
    expect(translateSearch('entity.risk.calculated_score_norm >= 50')).toEqual({
      own: 'entity.risk.calculated_score_norm >= 50',
      group:
        'COALESCE(entity.relationships.resolution.risk.calculated_score_norm, entity.risk.calculated_score_norm) >= 50',
    });
  });

  it('matches what a missing value is not, as KQL does', () => {
    expect(translateSearch('not asset.criticality: high_impact')?.own).toBe(
      `COALESCE(NOT (${CRITICALITY}), true)`
    );
  });

  it('combines the parts of a search as it groups them', () => {
    expect(
      translateSearch(
        'asset.criticality: high_impact and (entity.source: okta or entity.source: aws)'
      )?.own
    ).toBe(
      `(${CRITICALITY} AND (MV_CONTAINS(entity.source, "okta") OR MV_CONTAINS(entity.source, "aws")))`
    );
  });

  it('expands a list of values into alternatives', () => {
    expect(translateSearch('asset.criticality: (high_impact or extreme_impact)')?.own).toBe(
      '(asset.criticality == "high_impact" OR asset.criticality == "extreme_impact")'
    );
  });

  it('matches any value of a field for a lone wildcard', () => {
    expect(translateSearch('entity.source: *')?.own).toBe('entity.source IS NOT NULL');
  });

  it('escapes quotes in a value, and the characters LIKE reads as wildcards', () => {
    expect(translateSearch('asset.criticality: "a\\"b"')?.own).toBe('asset.criticality == "a\\"b"');
    expect(translateSearch('asset.criticality: a?b*')?.own).toBe(
      'asset.criticality LIKE "a\\\\?b*"'
    );
  });

  it.each([
    ['free text', 'bob'],
    ['a field that is not a group field', 'host.name: bob'],
    ['a field that is no own property of the table', 'constructor: bob'],
    ['a wildcard in the name of the field', 'entity.*: bob'],
    ['a wildcard on several values', 'entity.source: ok*'],
    ['a time', '@timestamp > 5'],
    ['a range on a field that is not a number', 'asset.criticality > 3'],
    ['a value that is not a number', 'entity.risk.calculated_score_norm: high'],
    [
      'a part that is not a group field, with parts that are',
      'asset.criticality: high_impact and host.name: bob',
    ],
    ['a part that is not a group field, under a negation', 'not host.name: bob'],
    ['a search that is not KQL', 'asset.criticality: ('],
  ])('is not translated for %s', (_name, kql) => {
    expect(translateSearch(kql)).toBeUndefined();
  });
});
