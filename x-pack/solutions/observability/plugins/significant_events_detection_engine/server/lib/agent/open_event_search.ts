/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignalStrategyId,
  EngineEvent,
  EngineEventStatus,
  EngineSeverity,
} from '../../../common';

/** The most events one search returns: enough to compare, few enough to read in one step. */
export const MAX_OPEN_EVENT_RESULTS = 20;
const DEFAULT_OPEN_EVENT_RESULTS = 10;
/** Signals listed per event; the rest are counted, so one long event cannot fill the context. */
const SIGNALS_PER_EVENT = 10;

/** What the agent sees of one open event. */
export interface IOpenEventSummary {
  event_id: string;
  title: string;
  summary: string;
  severity: EngineSeverity;
  status: EngineEventStatus;
  services: string[];
  /** Titles of the sources its signals came from: different sources are different systems. */
  sources: string[];
  opened_at: string;
  updated_at: string;
  signal_count: number;
  latest_signals: Array<{
    title: string;
    service: string;
    strategy: SignalStrategyId;
    last_seen: string;
  }>;
}

/** One page of open events, with how many exist and how many matched. */
export interface IOpenEventSearchResult {
  events: IOpenEventSummary[];
  total_open: number;
  matched: number;
}

/** Searches the open significant events of the run assessing a case. */
export interface IOpenEventSearch {
  /**
   * Open events, most recently updated first. `services` keeps events on any of them; `text`
   * keeps events whose title, summary, services or signals mention any of its words.
   */
  search(params: { services?: string[]; text?: string; limit?: number }): IOpenEventSearchResult;
}

function toSummary(
  event: EngineEvent,
  sourceTitle: (sourceId: string | undefined) => string | undefined
): IOpenEventSummary {
  const latest = [...event.members]
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen))
    .slice(0, SIGNALS_PER_EVENT);
  return {
    event_id: event.event_id,
    title: event.title,
    summary: event.summary,
    severity: event.severity,
    status: event.status,
    services: event.services,
    sources: [
      ...new Set(
        event.members.flatMap((member) => {
          const title = sourceTitle(member.source_id);
          return title ? [title] : [];
        })
      ),
    ],
    opened_at: event.opened_at,
    updated_at: event.updated_at,
    signal_count: event.members.length,
    latest_signals: latest.map((member) => ({
      title: member.title,
      service: member.service,
      strategy: member.strategy,
      last_seen: member.last_seen,
    })),
  };
}

function textOf(event: EngineEvent): string {
  return [
    event.title,
    event.summary,
    ...event.services,
    ...event.members.map((member) => member.title),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Reads the run's working set, not the index: the run writes events back only at the end, and a
 * signal must be able to join an event a previous signal opened a moment earlier.
 */
export function createOpenEventSearch({
  openEvents,
  sourceTitle,
}: {
  openEvents: () => EngineEvent[];
  sourceTitle: (sourceId: string | undefined) => string | undefined;
}): IOpenEventSearch {
  return {
    search({ services, text, limit }) {
      const open = openEvents();
      const wanted = new Set((services ?? []).map((service) => service.toLowerCase()));
      const words = (text ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 1);
      const matches = open
        .filter(
          (event) =>
            wanted.size === 0 || event.services.some((service) => wanted.has(service.toLowerCase()))
        )
        .filter((event) => {
          if (words.length === 0) {
            return true;
          }
          const haystack = textOf(event);
          return words.some((word) => haystack.includes(word));
        })
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      const size = Math.min(limit ?? DEFAULT_OPEN_EVENT_RESULTS, MAX_OPEN_EVENT_RESULTS);
      return {
        events: matches.slice(0, size).map((event) => toSummary(event, sourceTitle)),
        total_open: open.length,
        matched: matches.length,
      };
    },
  };
}
