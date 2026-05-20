import type { IBasePath } from '@kbn/core-http-server';
import type { BudgetingMethod, Objective, timeWindowSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
import type { Indicator, IndicatorTypes, SLODefinition, Status } from '../../../domain/models';
export interface EsSummaryDocument {
    service: {
        environment: string | null;
        name: string | null;
    };
    transaction: {
        name: string | null;
        type: string | null;
    };
    monitor: {
        config_id: string | null;
        name: string | null;
    };
    observer: {
        geo: {
            name: string | null;
        };
        name: string | null;
    };
    slo: {
        indicator: {
            type: IndicatorTypes;
        } | Indicator;
        timeWindow: t.OutputOf<typeof timeWindowSchema>;
        groupBy: string | string[];
        groupings: Record<string, unknown>;
        instanceId: string;
        name: string;
        description: string;
        id: string;
        budgetingMethod: BudgetingMethod;
        revision: number;
        objective: Objective;
        tags: string[];
        createdAt?: string;
        updatedAt?: string;
        createdBy?: string;
        updatedBy?: string;
    };
    goodEvents: number;
    totalEvents: number;
    errorBudgetEstimated: boolean;
    errorBudgetRemaining: number;
    errorBudgetConsumed: number;
    errorBudgetInitial: number;
    sliValue: number;
    statusCode: number;
    status: Status;
    isTempDoc: boolean;
    spaceId: string;
    kibanaUrl?: string;
    summaryUpdatedAt: string | null;
    latestSliTimestamp: string | null;
    fiveMinuteBurnRate?: {
        totalEvents: number;
        goodEvents: number;
        value: number;
    };
    oneHourBurnRate?: {
        totalEvents: number;
        goodEvents: number;
        value: number;
    };
    oneDayBurnRate?: {
        totalEvents: number;
        goodEvents: number;
        value: number;
    };
}
export declare function createTempSummaryDocument(slo: SLODefinition, spaceId: string, basePath: IBasePath): EsSummaryDocument;
