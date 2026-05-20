import type { ConnectionWithKey } from './types';
/**
 * Filters connections to only include those that are downstream (descendants) of the root service.
 * This performs a graph traversal starting from the root service, following outgoing edges.
 *
 * For example, given connections: A→B, B→C, A→D, X→Y
 * filterDownstreamConnections(connections, 'A') returns: A→B, B→C, A→D
 * (excludes X→Y because X is not reachable from A)
 *
 * This excludes sibling dependencies - services called by ancestors but not by the queried service
 * or its descendants.
 */
export declare function filterDownstreamConnections(connections: ConnectionWithKey[], rootServiceName: string, maxDepth?: number): ConnectionWithKey[];
/**
 * Filters connections to only include those that are upstream (ancestors) of the root service.
 * This performs a reverse graph traversal starting from the root service, following incoming edges.
 *
 * For example, given connections: A→B, B→C, C→D, X→Y
 * filterUpstreamConnections(connections, 'D') returns: A→B, B→C, C→D
 * (excludes X→Y because it doesn't lead to D)
 *
 * This excludes sibling dependencies - services that don't eventually call the queried service.
 *
 * IMPORTANT: Graph traversal relies on resolved `target['service.name']` for service-to-service
 * edges. We do NOT use heuristic matching on `span.destination.service.resource` because that
 * field can contain arbitrary values (proxy hostnames, IP addresses, load balancer names, etc.)
 * that don't necessarily relate to the downstream service name. For the root node only, we also
 * check exact `_dependencyName` match to handle external dependencies (e.g., "postgres").
 */
export declare function filterUpstreamConnections(connections: ConnectionWithKey[], rootServiceName: string, maxDepth?: number): ConnectionWithKey[];
