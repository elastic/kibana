/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchSettings } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCH_SETTINGS_SEED } from '@kbn/pnd-common';
import {
  WATCH_SCOPE_ROUTING_KEYS,
  readWatchSettingsDraft,
  withAllowManualRun,
  withScheduleId,
  withScopeRoutingSelection,
} from '.';

const settings: WatchSettings = {
  autonomy: 'manual',
  general: { runAsIdentity: 'svc-watch-floor', showMvpScopeWarning: true },
  runsLedger: [],
  scopeRouting: {
    assigneeQueue: { optionIds: ['unassigned', 'threat-hunting'], selectedId: 'unassigned' },
    dataSources: { optionIds: ['alerts-only', 'alerts-entities'], selectedId: 'alerts-only' },
    escalationContact: { optionIds: ['none', 'ir-on-call'], selectedId: 'none' },
  },
  skills: [
    { enabled: true, skillId: 'alert-triage' },
    { enabled: true, skillId: 'dark-web-feeds' },
  ],
  triggers: {
    allowManualRun: true,
    schedule: { optionIds: ['every-15m', 'hourly'], selectedId: 'every-15m' },
    sharedWithAttackDiscovery: true,
  },
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
};

const draft = readWatchSettingsDraft(settings);

describe('readWatchSettingsDraft', () => {
  it('seeds the two writable sections', () => {
    expect(Object.keys(draft).sort()).toEqual(['scopeRouting', 'triggers']);
  });

  it('leaves autonomy out of the draft, because the dial writes immediately', () => {
    expect('autonomy' in draft).toBe(false);
  });

  /**
   * Both left the draft with the controls that fed them, in bead kibana-phf4.33: the 2026-08-10 design
   * deleted the Approval gates section outright and every per-row enable toggle with it, so neither
   * has an edit for a Save to carry. `approvalGates` is also refused by the PATCH route now.
   */
  it('leaves approvalGates out of the draft, because the section that edited them is gone', () => {
    expect('approvalGates' in draft).toBe(false);
  });

  it('leaves skills out of the draft, because the per-row toggle is gone', () => {
    expect('skills' in draft).toBe(false);
  });

  it('seeds the triggers section unchanged', () => {
    expect(draft.triggers).toEqual(settings.triggers);
  });

  it('seeds every section as undefined for a watch with no settings yet', () => {
    expect(readWatchSettingsDraft(undefined)).toEqual({
      scopeRouting: undefined,
      triggers: undefined,
    });
  });
});

describe('WATCH_SCOPE_ROUTING_KEYS', () => {
  it('lists every scope-and-routing select a real watch payload carries', () => {
    const seeded = WATCH_SETTINGS_SEED[SYSTEM_SECURITY_WATCH_FLOOR_ID].scopeRouting;

    expect(Object.keys(seeded ?? {}).sort()).toEqual([...WATCH_SCOPE_ROUTING_KEYS]);
  });
});

describe('withScheduleId', () => {
  it('selects the new schedule', () => {
    expect(withScheduleId(draft, 'hourly').triggers?.schedule.selectedId).toBe('hourly');
  });

  it('keeps the options the watch offers', () => {
    expect(withScheduleId(draft, 'hourly').triggers?.schedule.optionIds).toEqual([
      'every-15m',
      'hourly',
    ]);
  });

  it('leaves the draft it was given untouched', () => {
    withScheduleId(draft, 'hourly');

    expect(draft.triggers?.schedule.selectedId).toBe('every-15m');
  });

  it('leaves the whole draft alone when the watch has no triggers section', () => {
    const withoutTriggers = readWatchSettingsDraft({ ...settings, triggers: undefined });

    expect(withScheduleId(withoutTriggers, 'hourly')).toBe(withoutTriggers);
  });
});

describe('withAllowManualRun', () => {
  it('records the new value', () => {
    expect(withAllowManualRun(draft, false).triggers?.allowManualRun).toBe(false);
  });

  it('leaves the whole draft alone when the watch has no triggers section', () => {
    const withoutTriggers = readWatchSettingsDraft({ ...settings, triggers: undefined });

    expect(withAllowManualRun(withoutTriggers, false)).toBe(withoutTriggers);
  });
});

describe('withScopeRoutingSelection', () => {
  it('retargets the named select', () => {
    expect(
      withScopeRoutingSelection(draft, 'assigneeQueue', 'threat-hunting').scopeRouting
        ?.assigneeQueue.selectedId
    ).toBe('threat-hunting');
  });

  it('leaves its sibling selects alone', () => {
    expect(
      withScopeRoutingSelection(draft, 'assigneeQueue', 'threat-hunting').scopeRouting?.dataSources
    ).toEqual(settings.scopeRouting?.dataSources);
  });

  it('leaves the whole draft alone when the watch has no scope and routing section', () => {
    const without = readWatchSettingsDraft({ ...settings, scopeRouting: undefined });

    expect(withScopeRoutingSelection(without, 'assigneeQueue', 'threat-hunting')).toBe(without);
  });
});
