/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARTICIPANT_TONES, participantBadgeColor } from '.';

describe('participantBadgeColor', () => {
  it('renders the accent tone as an accent badge', () => {
    expect(participantBadgeColor('accent')).toBe('accent');
  });

  it('renders the primary tone as a primary badge', () => {
    expect(participantBadgeColor('primary')).toBe('primary');
  });

  it('renders the success tone as a success badge', () => {
    expect(participantBadgeColor('success')).toBe('success');
  });

  it('renders the warning tone as a warning badge', () => {
    expect(participantBadgeColor('warning')).toBe('warning');
  });

  it('falls back to a hollow badge for a watch with no tone', () => {
    expect(participantBadgeColor(undefined)).toBe('hollow');
  });

  it('maps every tone to a colour', () => {
    expect(PARTICIPANT_TONES.filter((tone) => participantBadgeColor(tone) === 'hollow')).toEqual(
      []
    );
  });
});
