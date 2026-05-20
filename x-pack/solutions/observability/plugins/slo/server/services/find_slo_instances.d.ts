import type { IScopedClusterClient } from '@kbn/core/server';
import { type FindSLOInstancesParams, type FindSLOInstancesResponse } from '@kbn/slo-schema';
import type { SLODefinitionClient } from './slo_definition_client';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    definitionClient: SLODefinitionClient;
}
export declare function findSLOInstances(params: FindSLOInstancesParams, { scopedClusterClient, definitionClient }: Dependencies): Promise<FindSLOInstancesResponse>;
export {};
