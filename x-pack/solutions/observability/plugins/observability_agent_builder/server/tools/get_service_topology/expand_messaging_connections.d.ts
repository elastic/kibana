import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ConnectionWithKey } from './types';
export declare const MAX_MESSAGING_DEPS_TO_EXPAND = 5;
/**
 * For each messaging dependency, find other services that also connect to it.
 * This reveals the other side of the pipeline (e.g., the producer when we started
 * from a consumer, or vice versa). Only returns connections not already present
 * in existingConnections.
 *
 * Caps expansion to MAX_MESSAGING_DEPS_TO_EXPAND to bound the number of ES queries.
 * Each dependency triggers two queries (trace IDs + exit spans), so this prevents
 * unbounded latency when many messaging topics appear in the topology.
 */
export declare function expandMessagingConnections({ apmEventClient, dataRegistry, request, logger, messagingDeps, existingConnections, startMs, endMs, }: {
    apmEventClient: APMEventClient;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    logger: Logger;
    messagingDeps: string[];
    existingConnections: ConnectionWithKey[];
    startMs: number;
    endMs: number;
}): Promise<ConnectionWithKey[]>;
