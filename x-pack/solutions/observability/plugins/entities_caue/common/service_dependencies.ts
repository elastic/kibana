/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** event.action value for relationship_observed docs emitted by the service-dependencies maintainer. */
export const SERVICE_DEPENDENCY_EVENT_ACTION = 'relationship_observed' as const;

/** Relationship kind used by the service-dependencies maintainer. */
export const SERVICE_DEPENDENCY_KIND = 'depends_on' as const;

/**
 * Prefix used on `depends_on.target` for unresolved backend resources (databases, external
 * endpoints). Mirrors APM's `getExitSpanNodeId` convention so dependency node ids are
 * caller-agnostic — two services calling `elasticsearch` share one `>elasticsearch` node.
 */
export const BACKEND_NODE_PREFIX = '>' as const;

/**
 * Returns the `depends_on.target` value for an unresolved backend resource.
 * Declared here so the writer and the read-route use the same convention.
 */
export const toBackendTarget = (resource: string): string => `${BACKEND_NODE_PREFIX}${resource}`;

/** Returns true when a `depends_on.target` value refers to a backend node (not a service). */
export const isBackendTarget = (target: string): boolean => target.startsWith(BACKEND_NODE_PREFIX);

/** Strips the backend prefix from a target value to get the display label. */
export const toBackendLabel = (target: string): string => target.slice(BACKEND_NODE_PREFIX.length);

/**
 * A single directed dependency edge: source → target.
 * - `targetKind === 'service'`  → `target` is a service EUID (e.g. `service:checkout`)
 * - `targetKind === 'backend'`  → `target` is the bare resource string (e.g. `elasticsearch`);
 *   the `>` prefix has already been stripped by the route.
 */
export interface ServiceDependencyEdge {
  source: string;
  target: string;
  targetKind: 'service' | 'backend';
  lastSeen: string;
}

/** API response shape for GET /internal/entities_caue/service_dependencies. */
export interface ServiceDependenciesResponse {
  edges: ServiceDependencyEdge[];
}
