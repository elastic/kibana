import type { CompositeSLOMemberSummary, CompositeSLOSummary } from '@kbn/slo-schema';
import type { CompositeSLODefinition, Summary } from '../../domain/models';
import type { BurnRateWindow } from '../summary_client';
export interface MemberSummaryData {
    member: {
        sloId: string;
        weight: number;
        instanceId?: string;
    };
    sloName: string;
    summary: Pick<Summary, 'sliValue' | 'status' | 'errorBudget' | 'fiveMinuteBurnRate' | 'oneHourBurnRate' | 'oneDayBurnRate'>;
    burnRateWindows: BurnRateWindow[];
}
export declare function computeCompositeSummary(compositeSlo: CompositeSLODefinition, memberSummaries: MemberSummaryData[]): {
    compositeSummary: CompositeSLOSummary;
    members: CompositeSLOMemberSummary[];
};
export declare function buildNoDataSummary(): CompositeSLOSummary;
