/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ICON,
  EXTERNAL,
  getDirectionIcon,
  INBOUND,
  INCOMING,
  INTERNAL,
  LISTENING,
  OUTBOUND,
  OUTGOING,
  UNKNOWN,
} from '.';

describe('direction', () => {
  describe('#getDirectionIcon', () => {
    const knownDirections = [
      { direction: INBOUND, expected: 'chevronSingleDown' },
      { direction: OUTBOUND, expected: 'chevronSingleUp' },
      { direction: EXTERNAL, expected: 'globe' },
      { direction: INTERNAL, expected: 'bullseye' },
      { direction: INCOMING, expected: 'chevronSingleDown' },
      { direction: OUTGOING, expected: 'chevronSingleUp' },
      { direction: LISTENING, expected: 'chevronSingleDown' },
      { direction: UNKNOWN, expected: DEFAULT_ICON },
    ];

    test('returns the default icon when the direction is null', () => {
      expect(getDirectionIcon(null)).toEqual(DEFAULT_ICON);
    });

    test('returns the default icon when the direction is an unexpected value', () => {
      expect(getDirectionIcon('that was unexpected!')).toEqual(DEFAULT_ICON);
    });

    knownDirections.forEach(({ direction, expected }) => {
      test(`returns ${expected} for known direction ${direction}`, () => {
        expect(getDirectionIcon(direction)).toEqual(expected);
      });
    });
  });
});
