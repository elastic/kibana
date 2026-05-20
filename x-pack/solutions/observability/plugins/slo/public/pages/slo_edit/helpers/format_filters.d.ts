import type { QuerySchema, FiltersSchema } from '@kbn/slo-schema';
export declare const formatAllFilters: (globalFilters: QuerySchema | undefined, groupByCardinalityFilters: FiltersSchema) => QuerySchema;
