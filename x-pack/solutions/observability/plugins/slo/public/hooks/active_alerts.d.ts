import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
type SLO = Pick<SLOWithSummaryResponse, 'id' | 'instanceId'>;
export declare class ActiveAlerts {
    private data;
    constructor(entries?: Array<[SLO, number]>);
    get(slo: SLO): number | undefined;
}
export {};
