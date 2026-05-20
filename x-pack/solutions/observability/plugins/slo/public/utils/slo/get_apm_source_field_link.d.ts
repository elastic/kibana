import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface ResolvedApmParams {
    serviceName: string;
    environment: string;
    transactionType: string;
    transactionName: string;
}
export declare const APM_SOURCE_FIELDS: {
    readonly SERVICE_NAME: "service.name";
    readonly SERVICE_ENVIRONMENT: "service.environment";
    readonly TRANSACTION_TYPE: "transaction.type";
    readonly TRANSACTION_NAME: "transaction.name";
};
export type ApmSourceField = (typeof APM_SOURCE_FIELDS)[keyof typeof APM_SOURCE_FIELDS];
interface ApmLocator {
    getRedirectUrl(params: Record<string, unknown>): string;
}
export declare const getResolvedApmParams: (slo: SLOWithSummaryResponse) => ResolvedApmParams;
export declare function getApmSourceFieldLink({ apmLocator, serviceName, timeRange, field, value, }: {
    apmLocator: ApmLocator | undefined;
    serviceName: string;
    timeRange: {
        from: string;
        to: string;
    };
    field: ApmSourceField;
    value: string;
}): string | undefined;
export {};
