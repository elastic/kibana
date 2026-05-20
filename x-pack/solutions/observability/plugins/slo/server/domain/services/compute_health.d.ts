import type { IScopedClusterClient } from '@kbn/core/server';
import type { TransformHealth } from '../models/health';
interface Item {
    id: string;
    instanceId?: string;
    revision: number;
    name: string;
    enabled: boolean;
}
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
}
export interface SLOHealth {
    id: string;
    instanceId: string;
    revision: number;
    name: string;
    health: {
        isProblematic: boolean;
        rollup: TransformHealth;
        summary: TransformHealth;
    };
}
export declare function computeHealth(list: Item[], deps: Dependencies): Promise<SLOHealth[]>;
export {};
