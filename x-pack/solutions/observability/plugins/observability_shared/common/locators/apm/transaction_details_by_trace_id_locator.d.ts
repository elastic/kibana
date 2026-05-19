import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR, type TransactionDetailsByTraceIdLocatorParams } from '@kbn/deeplinks-observability';
export { TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR, type TransactionDetailsByTraceIdLocatorParams };
export type TransactionDetailsByTraceIdLocator = LocatorPublic<TransactionDetailsByTraceIdLocatorParams>;
export declare class TransactionDetailsByTraceIdLocatorDefinition implements LocatorDefinition<TransactionDetailsByTraceIdLocatorParams> {
    readonly id = "TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR";
    readonly getLocation: ({ rangeFrom, rangeTo, waterfallItemId, traceId, }: TransactionDetailsByTraceIdLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
