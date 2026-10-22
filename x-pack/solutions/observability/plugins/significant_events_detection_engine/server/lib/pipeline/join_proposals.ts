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
  /**
   * The Nightshift source the relationship was learned or observed in. Service names are not
   * unique across systems: `postgres` in one shop is not `postgres` in another, so a dependency
   * only links what was seen in its own source. Undefined applies everywhere.
   */
  source_id?: string;
  /** `shared_requests`: both serve the same requests, direction unknown. Default: `source` calls `target`. */
  kind?: 'calls' | 'shared_requests';
}

/** A service an event holds, with the source its signal came from when known. */
interface EventEntity {
  service: string;
  source_id?: string;
}

/** True when the dependency may link something seen in `sourceId`: same source, or either unknown. */
export function appliesTo(dependency: Dependency, sourceId: string | undefined): boolean {
  return (
    dependency.source_id === undefined ||
    sourceId === undefined ||
    dependency.source_id === sourceId
  );
}

/** The dependencies that may link a signal from `sourceId`. */
export function dependenciesFor(
  dependencies: Dependency[],
  sourceId: string | undefined
): Dependency[] {
  return dependencies.filter((dependency) => appliesTo(dependency, sourceId));
}

/** An open event a signal may join, with the reason code proposes it. */
export interface JoinProposal {
  event: EngineEvent;
  relation: 'same_service' | 'upstream' | 'downstream' | 'named_in_evidence' | 'shared_dependency';
  /** The service that links them: the one in the event, or the dependency both call. */
  via: string;
  reason: string;
  minutesApart: number;
  /** For a dependency relation, whether it was a call or a shared request path. */
  dependencyKind?: Dependency['kind'];
}

/**
 * How directly the logs show a link, strongest first: a service the event holds, a service the
 * signal's own rows name, a call the logs name, a dependency both call, and last a request path
 * the topology saw, which no row of the case may show.
 */
function strengthOf(
  relation: JoinProposal['relation'],
  dependencyKind: Dependency['kind']
): number {
  if (relation === 'same_service') {
    return 0;
  }
  if (relation === 'named_in_evidence') {
    return 1;
  }
  if (relation === 'shared_dependency') {
    return 3;
  }
  return dependencyKind === 'shared_requests' ? 4 : 2;
}

/** How a signal relates to one open event, through which service. */
interface Relation {
  relation: JoinProposal['relation'];
  via: string;
  dependencyKind?: Dependency['kind'];
}

function relationOf({
  service,
  sourceId,
  eventEntities,
  dependencies,
  namedServices,
}: {
  service: string;
  sourceId?: string;
  eventEntities: EventEntity[];
  dependencies: Dependency[];
  namedServices: string[];
}): Relation | undefined {
  const eventServices = [...new Set(eventEntities.map((entity) => entity.service))];
  if (eventServices.includes(service)) {
    return { relation: 'same_service', via: service };
  }
  // A dependency links the signal to the event only through the event's own services seen in
  // the dependency's source, so two systems sharing a service name are never linked.
  const inEvent = (dependency: Dependency, eventService: string) =>
    eventEntities.some(
      (entity) => entity.service === eventService && appliesTo(dependency, entity.source_id)
    );
  const ownDependencies = dependenciesFor(dependencies, sourceId);
  const named = namedServices.find((name) =>
    eventEntities.some(
      (entity) =>
        entity.service === name &&
        (sourceId === undefined || entity.source_id === undefined || entity.source_id === sourceId)
    )
  );
  // The signal's service calls a service in the event: the event may be its cause.
  const calls = ownDependencies
    .filter((dependency) => dependency.source === service && inEvent(dependency, dependency.target))
    .map(
      (dependency): Relation => ({
        relation: 'downstream',
        via: dependency.target,
        dependencyKind: dependency.kind,
      })
    );
  const calledBy = ownDependencies
    .filter((dependency) => dependency.target === service && inEvent(dependency, dependency.source))
    .map(
      (dependency): Relation => ({
        relation: 'upstream',
        via: dependency.source,
        dependencyKind: dependency.kind,
      })
    );
  // Both call the same service: one failing dependency makes all its callers complain. Only
  // calls the logs name count: a shared request path says nothing about who calls whom.
  const shared = ownDependencies
    .filter(
      (dependency) =>
        dependency.kind !== 'shared_requests' &&
        dependency.source === service &&
        dependencies.some(
          (other) =>
            other.kind !== 'shared_requests' &&
            other.target === dependency.target &&
            appliesTo(other, dependency.source_id) &&
            inEvent(other, other.source)
        )
    )
    .map((dependency): Relation => ({ relation: 'shared_dependency', via: dependency.target }));
  const candidates: Relation[] = [
    ...(named ? [{ relation: 'named_in_evidence' as const, via: named }] : []),
    ...calls,
    ...calledBy,
    ...shared,
  ];
  return candidates.sort(
    (a, b) => strengthOf(a.relation, a.dependencyKind) - strengthOf(b.relation, b.dependencyKind)
  )[0];
}

/**
 * Proposes which open events a signal may join, best first. Code proposes and the agent only
 * confirms or vetoes. Time ranks candidates but never decides alone, because related symptoms
 * can arrive minutes apart; the window only bounds how far back code looks.
 */
export function proposeJoins({
  service,
  sourceId,
  at,
  openEvents,
  dependencies,
  joinWindowMinutes,
  namedServices = [],
}: {
  /**
   * Services the signal's own evidence rows name. An open event holding one of them, seen in
   * the same source, is proposed even when no dependency is known.
   */
  namedServices?: string[];
  service: string;
  /** The source the signal came from; undefined for signals outside any source. */
  sourceId?: string;
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
      const relation = relationOf({
        service,
        sourceId,
        eventEntities: event.members.map((member) => ({
          service: member.service,
          source_id: member.source_id,
        })),
        dependencies,
        namedServices,
      });
      if (!relation) {
        return [];
      }
      const reason =
        relation.relation === 'same_service'
          ? `same service (${service})`
          : relation.dependencyKind === 'shared_requests' &&
            (relation.relation === 'downstream' || relation.relation === 'upstream')
          ? `${service} and ${relation.via}, which is in this event, serve the same requests`
          : relation.relation === 'downstream'
          ? `${service} calls ${relation.via}, which is in this event`
          : relation.relation === 'upstream'
          ? `${relation.via}, which is in this event, calls ${service}`
          : relation.relation === 'named_in_evidence'
          ? `${service}'s evidence rows name ${relation.via}, which is in this event`
          : `${service} and a service in this event both call ${relation.via}`;
      return [
        {
          event,
          relation: relation.relation,
          via: relation.via,
          reason,
          minutesApart,
          dependencyKind: relation.dependencyKind,
        },
      ];
    })
    .sort(
      (a, b) =>
        strengthOf(a.relation, a.dependencyKind) - strengthOf(b.relation, b.dependencyKind) ||
        a.minutesApart - b.minutesApart
    );
}
