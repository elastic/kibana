import type { TransformHealth } from '../../../domain/models/health';
export interface HealthDocument {
    '@timestamp': string;
    scanId: string;
    spaceId: string;
    slo: {
        id: string;
        revision: number;
        name: string;
        enabled: boolean;
    };
    health: {
        isProblematic: boolean;
        rollup: TransformHealth;
        summary: TransformHealth;
    };
}
