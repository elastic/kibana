/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { blockedScopeGuidance } from './blocked_scope_guidance';
import { NO_SEARCHABLE_PATTERN_MESSAGE } from './partition_hunt_universe';

describe('blockedScopeGuidance', () => {
  const emptyUniverse = { resolution: 'blocked:empty_universe' as const, missing: [] };

  it('says the resolve failed, whatever else the scope carries', () => {
    expect(
      blockedScopeGuidance(
        { resolution: 'blocked:discovery_failed', missing: [], policy_skipped: ['.alerts-x'] },
        ['-logs-x*']
      )
    ).toEqual({
      message: 'Hunt scope resolution failed, so no index was searched (checked: -logs-x*).',
      nextStep:
        "Check Elasticsearch connectivity and the calling user's index privileges, then retry.",
    });
  });

  it('blames policy when only hidden or alerts entries were configured', () => {
    expect(
      blockedScopeGuidance({ ...emptyUniverse, policy_skipped: ['.alerts-x'] }, ['-logs-x*'])
        .message
    ).toBe(NO_SEARCHABLE_PATTERN_MESSAGE);
  });

  it('says a list of only exclusions holds only exclusions', () => {
    expect(blockedScopeGuidance(emptyUniverse, ['-logs-x*', 'remote:-logs-y*']).message).toBe(
      'The default data view has no pattern this hunt may search: it holds only exclusions.'
    );
  });

  it('lists what was checked when nothing in it is visible', () => {
    expect(
      blockedScopeGuidance({ ...emptyUniverse, missing: ['custom-1'] }, ['custom-1', '-logs-x*'])
        .message
    ).toBe(
      "No index in the space's default data view is visible to this hunt (checked: custom-1, -logs-x*)."
    );
  });
});
