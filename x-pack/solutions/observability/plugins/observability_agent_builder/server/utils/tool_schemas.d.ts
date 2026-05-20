import { z } from '@kbn/zod/v4';
export declare const indexDescription = "Concrete index or index pattern to analyze. Example: \"logs-*\".";
export declare const timeRangeSchemaRequired: {
    start: z.ZodString;
    end: z.ZodString;
};
export declare function timeRangeSchemaOptional(defaultTimeRange: {
    start: string;
    end: string;
}): {
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
};
