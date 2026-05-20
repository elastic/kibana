import type { IScopedClusterClient, Logger, SavedObjectsClient } from '@kbn/core/server';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    soClient: SavedObjectsClient;
    logger: Logger;
    abortController: AbortController;
}
interface RunParams {
    scanId: string;
}
export declare function runHealthScan(params: RunParams, dependencies: Dependencies): Promise<{
    processed: number;
    problematic: number;
}>;
export {};
