import type { IScopedClusterClient } from '@kbn/core/server';
import { type PurgeInstancesParams, type PurgeInstancesResponse } from '@kbn/slo-schema';
import type { SLOSettings } from '../domain/models';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    spaceId: string;
    settings: SLOSettings;
}
export declare function purgeInstances(params: PurgeInstancesParams, { scopedClusterClient, spaceId, settings }: Dependencies): Promise<PurgeInstancesResponse>;
export {};
