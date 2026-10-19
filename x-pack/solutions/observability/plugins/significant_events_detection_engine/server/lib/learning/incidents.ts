/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DetectionStrategyId,
  DismissalReason,
  EngineEvent,
  IncidentOrigin,
  LabelledIncident,
} from '../../../common';
import { MINUTE_MS } from '../../../common';
import type { IStateStore } from '../storage/state_store';

/** Dismissal reasons that say the engine was wrong to raise; a duplicate only says it raised twice. */
const FALSE_POSITIVE_REASONS: readonly DismissalReason[] = [
  'false_positive',
  'expected_behavior',
  'not_actionable',
];
/** Without an end, an incident is taken to last this long when matching detections to it. */
export const DEFAULT_INCIDENT_MINUTES = 30;
/** A detection this long before an incident's start still counts as catching it. */
export const EARLY_MATCH_MS = 2 * MINUTE_MS;

/**
 * One episode's window, 1-based, the current one by default: when the problem this label is
 * about started and ended.
 */
function episodeWindow(
  event: EngineEvent,
  episode = event.open_windows.length
): { from: string; to?: string; raised_at?: string } {
  const window = event.open_windows[episode - 1];
  return window ?? { from: event.opened_at, to: event.closed_at };
}

function labelFromEvent({
  event,
  label,
  description,
  origin,
  episode,
}: {
  event: EngineEvent;
  label: LabelledIncident['label'];
  description: string;
  origin: IncidentOrigin;
  episode?: number;
}): LabelledIncident {
  const window = episodeWindow(event, episode);
  return {
    incident_id: uuidv4(),
    label,
    services: event.services,
    from: window.from,
    to: window.to,
    description,
    origin,
    event_id: event.event_id,
    fingerprints: event.members.map((member) => member.fingerprint),
    strategies: [...new Set(event.members.map((member) => member.strategy))],
    warning_minutes:
      label === 'confirmed' && window.raised_at
        ? Math.max(0, (Date.parse(window.raised_at) - Date.parse(window.from)) / MINUTE_MS)
        : undefined,
    created_at: new Date().toISOString(),
  };
}

/** A person confirmed an event was a real problem. */
export async function labelConfirmed({
  state,
  event,
  note,
  origin = 'operator',
  episode,
}: {
  state: IStateStore;
  event: EngineEvent;
  note?: string;
  origin?: IncidentOrigin;
  /** 1-based; the current episode when absent. */
  episode?: number;
}): Promise<LabelledIncident> {
  const incident = labelFromEvent({
    event,
    label: 'confirmed',
    description: note ? `${event.title}: ${note}` : event.title,
    origin,
    episode,
  });
  await state.put('incident', incident, { key: incident.incident_id });
  return incident;
}

/** A person dismissed an event as wrong to raise; a duplicate is not labelled. */
export async function labelDismissed({
  state,
  event,
  reason,
  note,
}: {
  state: IStateStore;
  event: EngineEvent;
  reason: DismissalReason;
  note?: string;
}): Promise<LabelledIncident | undefined> {
  if (!FALSE_POSITIVE_REASONS.includes(reason)) {
    return undefined;
  }
  const incident = labelFromEvent({
    event,
    label: 'false_positive',
    description: `${event.title}: dismissed as ${reason}${note ? ` ("${note}")` : ''}`,
    origin: 'operator',
  });
  await state.put('incident', incident, { key: incident.incident_id });
  return incident;
}

/** A person reports a problem the engine did not raise, or raised too late. */
export async function labelMissed({
  state,
  services,
  from,
  to,
  description,
  strategies = [],
}: {
  state: IStateStore;
  services: string[];
  from: string;
  to?: string;
  description: string;
  strategies?: DetectionStrategyId[];
}): Promise<LabelledIncident> {
  const incident: LabelledIncident = {
    incident_id: uuidv4(),
    label: 'missed',
    services,
    from,
    to,
    description,
    origin: 'operator',
    fingerprints: [],
    strategies,
    created_at: new Date().toISOString(),
  };
  await state.put('incident', incident, { key: incident.incident_id });
  return incident;
}

export async function listIncidents(state: IStateStore): Promise<LabelledIncident[]> {
  return state.list('incident');
}

/** The window a detection must fall in to count as catching the incident. */
export function incidentWindow(incident: LabelledIncident): { from: number; to: number } {
  const from = Date.parse(incident.from);
  return {
    from: from - EARLY_MATCH_MS,
    to: incident.to ? Date.parse(incident.to) : from + DEFAULT_INCIDENT_MINUTES * MINUTE_MS,
  };
}
