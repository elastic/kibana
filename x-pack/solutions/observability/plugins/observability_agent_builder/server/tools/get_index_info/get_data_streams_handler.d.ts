import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ObservabilityDataSources } from '../../utils/get_observability_data_sources';
/** Information about an individual data stream */
export interface DataStreamInfo {
    /** Full data stream name (e.g., "metrics-system.memory-default") */
    name: string;
    /** Dataset extracted from name (e.g., "system.memory") */
    dataset: string;
}
/**
 * Discovers observability data streams in the cluster.
 * Returns a flat list of data streams with their datasets, sorted by name.
 *
 * Uses the configured observability index patterns (from getObservabilityDataSources)
 * to ensure consistency and support for CCS (Cross-Cluster Search) if configured.
 *
 * @example
 * // Returns:
 * [
 *   { name: "logs-apm.error-default", dataset: "apm.error" },
 *   { name: "metrics-system.cpu-default", dataset: "system.cpu" },
 *   { name: "traces-apm-default", dataset: "apm" }
 * ]
 */
export declare function getDataStreamsHandler({ esClient, dataSources, logger, }: {
    esClient: IScopedClusterClient;
    dataSources: ObservabilityDataSources;
    logger: Logger;
}): Promise<DataStreamInfo[]>;
