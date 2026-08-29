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
} from '@kbn/pnd-common';
import {
  readWatchSettingsDraft,
  withAllowManualRun,
  withGenerationAlertSize,
  withGenerationConnectorId,
  withGenerationLookback,
  withScheduleId,
  withScopeRoutingSelection,
} from '../watch_settings_draft';
import { buildWatchSettingsPatch, hasWatchSettingsChanges } from '.';

const settings: WatchSettings = {
  autonomy: 'manual',
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

const baseline = readWatchSettingsDraft(settings);
const generationBaseline = readWatchSettingsDraft(generationSettings);

describe('buildWatchSettingsPatch', () => {
  it('sends nothing when nothing was edited', () => {
    expect(buildWatchSettingsPatch(baseline, baseline)).toEqual({});
  });

  it('sends nothing when a field was edited and put back', () => {
    const draft = withScheduleId(withScheduleId(baseline, 'hourly'), 'every-15m');

    expect(buildWatchSettingsPatch(baseline, draft)).toEqual({});
  });

  it('sends only the schedule when only the schedule changed', () => {
    expect(buildWatchSettingsPatch(baseline, withScheduleId(baseline, 'hourly'))).toEqual({
      triggers: { scheduleId: 'hourly' },
    });
  });

  it('sends only the manual-run flag when only that changed', () => {
    expect(buildWatchSettingsPatch(baseline, withAllowManualRun(baseline, false))).toEqual({
      triggers: { allowManualRun: false },
    });
  });

  it('sends both trigger fields when both changed', () => {
    const draft = withAllowManualRun(withScheduleId(baseline, 'hourly'), false);

    expect(buildWatchSettingsPatch(baseline, draft)).toEqual({
      triggers: { allowManualRun: false, scheduleId: 'hourly' },
    });
  });

  it('sends only the generation fields that changed', () => {
    const draft = withGenerationLookback(
      withGenerationAlertSize(generationBaseline, 250),
      'now-7d'
    );

    expect(buildWatchSettingsPatch(generationBaseline, draft)).toEqual({
      generation: { alertSize: 250, lookback: 'now-7d' },
    });
  });

  it('sends nothing when a generation field was edited and put back', () => {
    const draft = withGenerationAlertSize(withGenerationAlertSize(generationBaseline, 250), 100);

    expect(buildWatchSettingsPatch(generationBaseline, draft)).toEqual({});
  });

  /** '' is a value, not an absence: it retargets the run onto the server-resolved default. */
  it('sends the empty connector id that selects the server-resolved default', () => {
    const withConnector = readWatchSettingsDraft({
      ...generationSettings,
      generation: { alertSize: 100, connectorId: 'my-gpt4o', lookback: 'now-24h' },
    });

    expect(
      buildWatchSettingsPatch(withConnector, withGenerationConnectorId(withConnector, ''))
    ).toEqual({ generation: { connectorId: '' } });
  });

  it('sends generation and trigger edits together in the one patch', () => {
    const draft = withGenerationAlertSize(withScheduleId(generationBaseline, 'hourly'), 250);

    expect(buildWatchSettingsPatch(generationBaseline, draft)).toEqual({
      generation: { alertSize: 250 },
      triggers: { scheduleId: 'hourly' },
    });
  });

  it('sends no generation for a watch whose payload offers none', () => {
    expect(
      'generation' in buildWatchSettingsPatch(baseline, withScheduleId(baseline, 'hourly'))
    ).toBe(false);
  });

  it('sends only the selects that were retargeted', () => {
    const draft = withScopeRoutingSelection(baseline, 'assigneeQueue', 'threat-hunting');

    expect(buildWatchSettingsPatch(baseline, draft)).toEqual({
      scopeRouting: { assigneeQueue: 'threat-hunting' },
    });
  });

  it('sends a whole page of edits as one patch, which is what Save posts', () => {
    const draft = withScopeRoutingSelection(
      withAllowManualRun(withScheduleId(baseline, 'hourly'), false),
      'dataSources',
      'alerts-entities'
    );

    expect(buildWatchSettingsPatch(baseline, draft)).toEqual({
      scopeRouting: { dataSources: 'alerts-entities' },
      triggers: { allowManualRun: false, scheduleId: 'hourly' },
    });
  });

  /**
   * Both fields left the draft with the controls that produced them (bead kibana-phf4.33): the
   * 2026-08-10 design deleted the Approval gates section and every per-row enable toggle. Pinned
   * because the route still declares both fields — `skills` as a real write with no UI producer, and
   * `approvalGates` only so the route can refuse it explicitly — so "the type no longer allows it" is
   * not what stops them being sent.
   */
  it('never emits approvalGates, which the route refuses', () => {
    const draft = withScheduleId(baseline, 'hourly');

    expect('approvalGates' in buildWatchSettingsPatch(baseline, draft)).toBe(false);
  });

  it('never emits skills, because no control can toggle one', () => {
    const draft = withScheduleId(baseline, 'hourly');

    expect('skills' in buildWatchSettingsPatch(baseline, draft)).toBe(false);
  });

  it('never emits autonomyLevel, which the route refuses all-or-nothing', () => {
    const draft = withScheduleId(baseline, 'hourly');

    expect('autonomyLevel' in buildWatchSettingsPatch(baseline, draft)).toBe(false);
  });

  it('sends nothing for a watch whose sections are all absent', () => {
    const empty = readWatchSettingsDraft(undefined);

    expect(buildWatchSettingsPatch(empty, empty)).toEqual({});
  });
});

describe('hasWatchSettingsChanges', () => {
  it('reads a clean draft as clean', () => {
    expect(hasWatchSettingsChanges(buildWatchSettingsPatch(baseline, baseline))).toBe(false);
  });

  it('reads an edited draft as dirty', () => {
    expect(
      hasWatchSettingsChanges(buildWatchSettingsPatch(baseline, withScheduleId(baseline, 'hourly')))
    ).toBe(true);
  });
});
