import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function timeRangeFilter(timeField: string, { start, end }: {
    start: number;
    end: number;
}): QueryDslQueryContainer[];
export declare function kqlFilter(kuery?: string): QueryDslQueryContainer[];
export declare function environmentFilter(environment?: string): {
    term: {
        'service.environment': string;
    };
}[];
export declare function termFilter<T extends string>(field: T, value: string | boolean | number | undefined | null): QueryDslQueryContainer[];
