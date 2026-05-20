import type { FiltersSchema } from '@kbn/slo-schema';
export declare const getGroupByCardinalityFilters: ({ serviceName, environment, transactionType, transactionName, }: {
    serviceName: string;
    environment?: string;
    transactionType?: string;
    transactionName?: string;
}) => FiltersSchema;
