/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { WatchSettings } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { useWatchSettingsDraft } from '.';

const settings: WatchSettings = {
  autonomy: 'manual',
  scopeRouting: {
    assigneeQueue: { optionIds: ['unassigned', 'threat-hunting'], selectedId: 'unassigned' },
    dataSources: { optionIds: ['alerts-only', 'alerts-entities'], selectedId: 'alerts-only' },
    escalationContact: { optionIds: ['none', 'ir-on-call'], selectedId: 'none' },
  },
  skills: [{ enabled: true, skillId: 'alert-triage' }],
  triggers: {
    allowManualRun: true,
    schedule: { optionIds: ['every-15m', 'hourly'], selectedId: 'every-15m' },
    sharedWithAttackDiscovery: true,
  },
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
};

describe('useWatchSettingsDraft', () => {
  it('starts clean', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    expect(result.current.isDirty).toBe(false);
  });

  it('starts with the fetched settings in the draft', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    expect(result.current.draft.triggers).toEqual(settings.triggers);
  });

  it('turns dirty on the first edit', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));

    expect(result.current.isDirty).toBe(true);
  });

  it('accumulates a page of edits into one patch', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.setAllowManualRun(false));
    act(() => result.current.setScopeRoutingSelection('assigneeQueue', 'threat-hunting'));

    expect(result.current.patch).toEqual({
      scopeRouting: { assigneeQueue: 'threat-hunting' },
      triggers: { allowManualRun: false, scheduleId: 'hourly' },
    });
  });

  /**
   * The declutter (bead kibana-phf4.33) left the hook with three setters. Pinned by name, because a
   * setter re-added here would be the first half of re-adding a write path the design removed.
   *
   * ⚠️ `setScopeRoutingSelection` is still in this list on purpose, and it is the one setter with **no
   * caller**: the 2026-08-17 simplification (bead kibana-phf4.27) deferred the Scope & routing section
   * post-MVP, and deferred is not rejected — the section component, this setter, `withScopeRoutingSelection`,
   * `WATCH_SCOPE_ROUTING_KEYS` and the PATCH field are all intact so re-rendering it is one line. So an
   * unused setter here is the expected state, not dead code, and removing it from this list would be the
   * first half of deleting a deferred feature.
   */
  it('offers a setter for exactly the fields a control can still edit', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    expect(
      Object.keys(result.current)
        .filter((key) => key.startsWith('set'))
        .sort()
    ).toEqual(['setAllowManualRun', 'setScheduleId', 'setScopeRoutingSelection']);
  });

  it('turns clean again when an edit is put back by hand', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.setScheduleId('every-15m'));

    expect(result.current.isDirty).toBe(false);
  });

  it('puts every discarded control back to the fetched values', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.setScopeRoutingSelection('assigneeQueue', 'threat-hunting'));
    act(() => result.current.discard());

    expect(result.current.draft).toEqual({
      scopeRouting: settings.scopeRouting,
      triggers: settings.triggers,
    });
  });

  it('puts the discarded control back to the fetched value', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.discard());

    expect(result.current.draft.triggers?.schedule.selectedId).toBe('every-15m');
  });

  it('reads clean after a discard', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.discard());

    expect(result.current.isDirty).toBe(false);
  });

  it('reads clean once a save is marked', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.markSaved());

    expect(result.current.isDirty).toBe(false);
  });

  it('keeps the saved value in the draft after marking it saved', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.markSaved());

    expect(result.current.draft.triggers?.schedule.selectedId).toBe('hourly');
  });

  it('sends nothing on a second save with no further edits', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(settings));

    act(() => result.current.setScheduleId('hourly'));
    act(() => result.current.markSaved());

    expect(result.current.patch).toEqual({});
  });

  it('keeps unsaved edits when the same watch is refetched', () => {
    // `useUpdateWatch` invalidates the detail query on every settled write, so a new payload object
    // for the same watch is routine and must not throw away what the customer has typed.
    const { result, rerender } = renderHook(({ current }) => useWatchSettingsDraft(current), {
      initialProps: { current: settings },
    });

    act(() => result.current.setScheduleId('hourly'));
    rerender({ current: { ...settings } });

    expect(result.current.draft.triggers?.schedule.selectedId).toBe('hourly');
  });

  it('re-seeds when the payload starts describing another watch', () => {
    const { result, rerender } = renderHook(({ current }) => useWatchSettingsDraft(current), {
      initialProps: { current: settings },
    });

    act(() => result.current.setScheduleId('hourly'));
    rerender({ current: { ...settings, watchId: SYSTEM_SECURITY_WATCH_DEEP_ID } });

    expect(result.current.isDirty).toBe(false);
  });

  it('seeds from the first payload to arrive', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useWatchSettingsDraft>,
      { current: WatchSettings | undefined }
    >(({ current }) => useWatchSettingsDraft(current), { initialProps: { current: undefined } });

    rerender({ current: settings });

    expect(result.current.draft.triggers).toEqual(settings.triggers);
  });

  it('edits nothing on a watch that has no settings at all', () => {
    const { result } = renderHook(() => useWatchSettingsDraft(undefined));

    act(() => result.current.setScheduleId('hourly'));

    expect(result.current.isDirty).toBe(false);
  });
});
