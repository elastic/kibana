/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineEvent } from '../../../common';

/** A service relationship from knowledge: `source` calls `target`. */
export interface Dependency {
  source: string;
  target: string;
}

/** An open event a detection may join, with the reason code proposes it. */
export interface JoinProposal {
  event: EngineEvent;
  relation: 'same_service' | 'upstream' | 'downstream';
  reason: string;
  minutesApart: number;
}

const RELATION_RANK: Record<JoinProposal['relation'], number> = {
  same_service: 0,
  downstream: 1,
  upstream: 1,
};

function relationOf({
  service,
  eventServices,
  dependencies,
}: {
  service: string;
  eventServices: string[];
  dependencies: Dependency[];
}): { relation: JoinProposal['relation']; via: string } | undefined {
  if (eventServices.includes(service)) {
    return { relation: 'same_service', via: service };
  }
  // The detection's service calls a service in the event: the event may be its cause.
  const calls = dependencies.find(
    (dependency) => dependency.source === service && eventServices.includes(dependency.target)
  );
  if (calls) {
    return { relation: 'downstream', via: calls.target };
  }
  const calledBy = dependencies.find(
    (dependency) => dependency.target === service && eventServices.includes(dependency.source)
  );
  if (calledBy) {
    return { relation: 'upstream', via: calledBy.source };
  }
  return undefined;
}

/**
 * Proposes which open events a detection may join, best first. Code proposes and the agent only
 * confirms or vetoes. Time ranks candidates but never decides alone, because related symptoms
 * can arrive minutes apart; the window only bounds how far back code looks.
 */
export function proposeJoins({
  service,
  at,
  openEvents,
  dependencies,
  joinWindowMinutes,
}: {
  service: string;
  at: string;
  openEvents: EngineEvent[];
  dependencies: Dependency[];
  joinWindowMinutes: number;
}): JoinProposal[] {
  const atMs = Date.parse(at);

  return openEvents
    .flatMap((event): JoinProposal[] => {
      // Measured from the event's latest signal, so a long-running problem keeps attracting
      // related symptoms instead of splitting once it is older than the window.
      const latestActivity = Math.max(
        Date.parse(event.opened_at),
        ...event.members.map((member) => Date.parse(member.last_seen))
      );
      const minutesApart = Math.abs(atMs - latestActivity) / 60_000;
      if (minutesApart > joinWindowMinutes) {
        return [];
      }
      const relation = relationOf({ service, eventServices: event.services, dependencies });
      if (!relation) {
        return [];
      }
      const reason =
        relation.relation === 'same_service'
          ? `same service (${service})`
          : relation.relation === 'downstream'
          ? `${service} calls ${relation.via}, which is in this event`
          : `${relation.via}, which is in this event, calls ${service}`;
      return [{ event, relation: relation.relation, reason, minutesApart }];
    })
    .sort(
      (a, b) =>
        RELATION_RANK[a.relation] - RELATION_RANK[b.relation] || a.minutesApart - b.minutesApart
    );
}
