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
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { buildFlyoutParticipants } from '.';

const step = (phaseStepId: string, workflowId?: string): PndPhaseStepProjection => ({
  phaseStepId,
  status: 'completed',
  ...(workflowId != null ? { workflowId } : {}),
});

describe('buildFlyoutParticipants', () => {
  it('returns no participants for a projection with no steps', () => {
    expect(buildFlyoutParticipants([])).toEqual([]);
  });

  it('returns no participants when no step names a workflow', () => {
    expect(buildFlyoutParticipants([step('step-1-1'), step('step-1-2')])).toEqual([]);
  });

  it('names the watch that ran the steps', () => {
    expect(buildFlyoutParticipants([step('step-1-1', SYSTEM_SECURITY_WATCH_DEEP_ID)])).toEqual([
      { label: 'Forensic Watch', tone: 'accent', workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID },
    ]);
  });

  it('lists each distinct watch exactly once', () => {
    const participants = buildFlyoutParticipants([
      step('step-1-1', SYSTEM_SECURITY_WATCH_DEEP_ID),
      step('step-1-2', SYSTEM_SECURITY_WATCH_DEEP_ID),
      step('step-2-1', SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID),
    ]);

    expect(participants.map(({ workflowId }) => workflowId)).toEqual([
      SYSTEM_SECURITY_WATCH_DEEP_ID,
      SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
    ]);
  });

  it('keeps the watches in first-seen order', () => {
    const participants = buildFlyoutParticipants([
      step('step-1-1', SYSTEM_SECURITY_WATCH_OFFICER_ID),
      step('step-1-2', SYSTEM_SECURITY_WATCH_FLOOR_ID),
    ]);

    expect(participants.map(({ workflowId }) => workflowId)).toEqual([
      SYSTEM_SECURITY_WATCH_OFFICER_ID,
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
    ]);
  });

  it('treats an empty workflowId as no watch, because the server uses it for unknown', () => {
    expect(buildFlyoutParticipants([step('step-1-1', '')])).toEqual([]);
  });

  it('keeps the watches around an upstream row, which no workflow realized', () => {
    const participants = buildFlyoutParticipants([
      step('step-1-2'),
      step('step-1-1', SYSTEM_SECURITY_WATCH_FLOOR_ID),
    ]);

    expect(participants.map(({ workflowId }) => workflowId)).toEqual([
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
    ]);
  });

  it('tones the Dark Watch as accent, alongside the other long-horizon watch', () => {
    expect(buildFlyoutParticipants([step('step-1-1', SYSTEM_SECURITY_WATCH_DARK_ID)])).toEqual([
      { label: 'Dark Watch', tone: 'accent', workflowId: SYSTEM_SECURITY_WATCH_DARK_ID },
    ]);
  });

  it('tones the Post-Incident Watch as warning', () => {
    expect(
      buildFlyoutParticipants([step('step-1-1', SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID)])
    ).toEqual([
      {
        label: 'Post-Incident Watch',
        tone: 'warning',
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      },
    ]);
  });

  it('tones the Watch Floor as success', () => {
    expect(buildFlyoutParticipants([step('step-1-1', SYSTEM_SECURITY_WATCH_FLOOR_ID)])).toEqual([
      { label: 'Watch Floor', tone: 'success', workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
    ]);
  });

  it('tones the Watch Officer as primary', () => {
    expect(buildFlyoutParticipants([step('step-1-1', SYSTEM_SECURITY_WATCH_OFFICER_ID)])).toEqual([
      { label: 'Watch Officer', tone: 'primary', workflowId: SYSTEM_SECURITY_WATCH_OFFICER_ID },
    ]);
  });

  it('labels a custom watch with its raw workflow id', () => {
    expect(buildFlyoutParticipants([step('step-1-1', 'custom-watch-abc')])[0].label).toBe(
      'custom-watch-abc'
    );
  });

  it('gives a custom watch no tone rather than inventing one', () => {
    expect(buildFlyoutParticipants([step('step-1-1', 'custom-watch-abc')])[0].tone).toBeUndefined();
  });
});
