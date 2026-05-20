import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { TransactionDetailsByNameParams } from '@kbn/deeplinks-observability';
export type TransactionDetailsByNameLocator = LocatorPublic<TransactionDetailsByNameParams>;
export declare class TransactionDetailsByNameLocatorDefinition implements LocatorDefinition<TransactionDetailsByNameParams> {
    readonly id = "TransactionDetailsByNameLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, serviceName, transactionName, }: TransactionDetailsByNameParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
