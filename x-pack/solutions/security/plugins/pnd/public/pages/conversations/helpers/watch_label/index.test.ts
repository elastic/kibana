/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import { watchLabel } from '.';

describe('watchLabel', () => {
  it('labels the Forensic Watch', () => {
    expect(watchLabel(SYSTEM_SECURITY_WATCH_DEEP_ID)).toBe('Forensic Watch');
  });

  it('labels the Post-Incident Watch', () => {
    expect(watchLabel(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID)).toBe('Post-Incident Watch');
  });

  it('labels the Watch Floor', () => {
    expect(watchLabel(SYSTEM_SECURITY_WATCH_FLOOR_ID)).toBe('Watch Floor');
  });

  it('labels the Watch Officer', () => {
    expect(watchLabel(SYSTEM_SECURITY_WATCH_OFFICER_ID)).toBe('Watch Officer');
  });

  it('labels the Dark Watch', () => {
    expect(watchLabel(SYSTEM_SECURITY_WATCH_DARK_ID)).toBe('Dark Watch');
  });

  it('labels every managed watch, so a new one can never render as a raw id unnoticed', () => {
    const unlabelled = SYSTEM_SECURITY_WATCH_IDS.filter((id) => watchLabel(id) === id);

    expect(unlabelled).toEqual([]);
  });

  it('falls back to the raw workflow id for a custom watch, which has no registered name here', () => {
    expect(watchLabel('custom-watch-abc')).toBe('custom-watch-abc');
  });
});
