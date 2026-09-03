/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { remainingDisabledCatalogWatchIds } from '.';

const DETECTION_ID = 'system-security-watch-detection';

const catalogWatch = (id: string, enabled: boolean) => ({ enabled, id });

describe('remainingDisabledCatalogWatchIds', () => {
  it('returns the other catalog watches that are still off after enabling one', () => {
    expect(
      remainingDisabledCatalogWatchIds({
        justEnabledId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        watches: [
          catalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID, false),
          catalogWatch(SYSTEM_SECURITY_WATCH_DARK_ID, false),
          catalogWatch(SYSTEM_SECURITY_WATCH_DEEP_ID, false),
          catalogWatch(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID, false),
        ],
      })
    ).toEqual([
      SYSTEM_SECURITY_WATCH_OFFICER_ID,
      SYSTEM_SECURITY_WATCH_DARK_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
      SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
    ]);
  });

  it('skips catalog watches that are already enabled', () => {
    expect(
      remainingDisabledCatalogWatchIds({
        justEnabledId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        watches: [
          catalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_DARK_ID, false),
          catalogWatch(SYSTEM_SECURITY_WATCH_DEEP_ID, false),
          catalogWatch(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID, true),
        ],
      })
    ).toEqual([SYSTEM_SECURITY_WATCH_DARK_ID, SYSTEM_SECURITY_WATCH_DEEP_ID]);
  });

  it('does not include Detection or other non-catalog ids', () => {
    expect(
      remainingDisabledCatalogWatchIds({
        justEnabledId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        watches: [
          catalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, true),
          catalogWatch(DETECTION_ID, false),
          catalogWatch('custom-watch', false),
        ],
      })
    ).toEqual([
      SYSTEM_SECURITY_WATCH_OFFICER_ID,
      SYSTEM_SECURITY_WATCH_DARK_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
      SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
    ]);
  });

  it('returns nothing when the watch just enabled is not a catalog watch', () => {
    expect(
      remainingDisabledCatalogWatchIds({
        justEnabledId: DETECTION_ID,
        watches: [
          catalogWatch(DETECTION_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, false),
        ],
      })
    ).toEqual([]);
  });

  it('returns nothing when every other catalog watch is already on', () => {
    expect(
      remainingDisabledCatalogWatchIds({
        justEnabledId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        watches: [
          catalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_DARK_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_DEEP_ID, true),
          catalogWatch(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID, true),
        ],
      })
    ).toEqual([]);
  });
});
