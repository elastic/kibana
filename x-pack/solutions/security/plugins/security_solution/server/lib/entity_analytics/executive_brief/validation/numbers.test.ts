/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import { buildEntityIndex } from './entity_mentions';
import { buildNumberMask, collectAllowedNumbers, findInventedNumbers } from './numbers';

const allowed = collectAllowedNumbers(FIXTURE_SNAPSHOT);
const mask = buildNumberMask(FIXTURE_SNAPSHOT, buildEntityIndex(FIXTURE_SNAPSHOT));
const invented = (text: string): string[] => findInventedNumbers({ text, allowed, mask });

describe('findInventedNumbers', () => {
  it('reports numbers that are not in the snapshot, as written', () => {
    expect(invented('There are 4242 alerts and 3.7 percent drift, 1,200 logons.')).toEqual([
      '4242',
      '3.7',
      '1,200',
    ]);
  });

  it('accepts numbers that are in the snapshot', () => {
    expect(invented('23 alerts are open over 7 days.')).toEqual([]);
  });

  describe('masks identifiers that contain digits', () => {
    it.each([
      ['a lower-case UUID', 'Case 6ac716c0-7062-4941-a710-3ad055ef71db is open.'],
      ['an upper-case UUID', 'Case 6AC716C0-7062-4941-A710-3AD055EF71DB is open.'],
      ['a UUID in brackets', 'Case (6ac716c0-7062-4941-a710-3ad055ef71db).'],
      ['an ISO date', 'First seen on 2026-10-04.'],
      ['an ISO timestamp with milliseconds', 'Opened at 2026-10-06T14:35:12.250Z.'],
      ['an ISO timestamp with an offset', 'Opened at 2026-10-06T14:35:12+02:00.'],
      ['an ISO timestamp with a space', 'Opened at 2026-10-06 14:35:12.'],
      ['an IPv4 address', 'Traffic left to 203.0.113.77.'],
      ['an evidence id', 'See EVT-1-33 and CASE-47.'],
      ['a MITRE id', 'TA0008 and T1021.001.'],
    ])('%s', (_name, text) => {
      expect(invented(text)).toEqual([]);
    });

    it('still reports a real invented number next to them', () => {
      expect(
        invented('On 2026-10-04 case 6ac716c0-7062-4941-a710-3ad055ef71db grew to 4242 alerts.')
      ).toEqual(['4242']);
    });

    it('does not mask a bare year or a number that only looks like a date part', () => {
      expect(invented('In 2026 there were 99 alerts.')).toEqual(['2026', '99']);
      expect(invented('Scores of 5150-5151.')).toEqual(['5150', '5151']);
    });

    it('does not mask a version-like number with fewer than four parts', () => {
      expect(invented('Version 6.77.88 shipped.')).toEqual(['6.77', '88']);
    });
  });
});
