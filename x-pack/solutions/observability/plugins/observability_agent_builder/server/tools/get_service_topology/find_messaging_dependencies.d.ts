import type { ConnectionWithKey } from './types';
/**
 * Find messaging dependencies (Kafka topics, RabbitMQ queues, etc.) from a set of connections.
 * These are external nodes with span.type === 'messaging'.
 */
export declare function findMessagingDependencies(connections: ConnectionWithKey[]): string[];
