/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchSettings } from '@kbn/pnd-common';
import {
  SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  WATCH_SETTINGS_SEED,
} from '@kbn/pnd-common';
import {
  WATCH_SCOPE_ROUTING_KEYS,
  readWatchSettingsDraft,
  withAllowManualRun,
  withGenerationAlertSize,
  withGenerationConnectorId,
  withGenerationLookback,
  withScheduleId,
  withScopeRoutingSelection,
} from '.';

const settings: WatchSettings = {
  autonomy: 'manual',
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

/** The Attack Discovery Generation watch is the one watch whose payload carries `generation`. */
const generationSettings: WatchSettings = {
  ...settings,
  generation: { alertSize: 100, connectorId: '', lookback: 'now-24h' },
  watchId: SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
};

const draft = readWatchSettingsDraft(settings);
const generationDraft = readWatchSettingsDraft(generationSettings);

describe('readWatchSettingsDraft', () => {
  it('seeds the three writable sections', () => {
    expect(Object.keys(draft).sort()).toEqual(['generation', 'scopeRouting', 'triggers']);
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

  it('seeds the generation section unchanged', () => {
    expect(generationDraft.generation).toEqual(generationSettings.generation);
  });

  it('seeds no generation for a watch whose payload offers none', () => {
    expect(draft.generation).toBeUndefined();
  });

  it('seeds every section as undefined for a watch with no settings yet', () => {
    expect(readWatchSettingsDraft(undefined)).toEqual({
      generation: undefined,
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

describe('withGenerationAlertSize', () => {
  it('records the new size', () => {
    expect(withGenerationAlertSize(generationDraft, 250).generation?.alertSize).toBe(250);
  });

  it('leaves its sibling fields alone', () => {
    expect(withGenerationAlertSize(generationDraft, 250).generation?.lookback).toBe('now-24h');
  });

  it('leaves the draft it was given untouched', () => {
    withGenerationAlertSize(generationDraft, 250);

    expect(generationDraft.generation?.alertSize).toBe(100);
  });

  it('leaves the whole draft alone when the watch has no generation section', () => {
    expect(withGenerationAlertSize(draft, 250)).toBe(draft);
  });
});

describe('withGenerationLookback', () => {
  it('records the new window', () => {
    expect(withGenerationLookback(generationDraft, 'now-7d').generation?.lookback).toBe('now-7d');
  });

  it('leaves the whole draft alone when the watch has no generation section', () => {
    expect(withGenerationLookback(draft, 'now-7d')).toBe(draft);
  });
});

describe('withGenerationConnectorId', () => {
  it('records the new connector', () => {
    expect(withGenerationConnectorId(generationDraft, 'my-gpt4o').generation?.connectorId).toBe(
      'my-gpt4o'
    );
  });

  it('records the empty id that means the server-resolved default', () => {
    const chosen = withGenerationConnectorId(generationDraft, 'my-gpt4o');

    expect(withGenerationConnectorId(chosen, '').generation?.connectorId).toBe('');
  });

  it('leaves the whole draft alone when the watch has no generation section', () => {
    expect(withGenerationConnectorId(draft, 'my-gpt4o')).toBe(draft);
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
