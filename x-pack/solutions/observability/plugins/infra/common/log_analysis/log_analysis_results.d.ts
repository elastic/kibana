import * as rt from 'io-ts';
export declare const ML_SEVERITY_SCORES: {
    warning: number;
    minor: number;
    major: number;
    critical: number;
};
export type MLSeverityScoreCategories = keyof typeof ML_SEVERITY_SCORES;
export declare const ML_SEVERITY_COLORS: {
    critical: string;
    major: string;
    minor: string;
    warning: string;
};
export declare const getSeverityCategoryForScore: (score: number) => MLSeverityScoreCategories | undefined;
export declare const formatOneDecimalPlace: (number: number) => number;
export declare const getFriendlyNameForPartitionId: (partitionId: string) => string;
export declare const compareDatasetsByMaximumAnomalyScore: <Dataset extends {
    maximumAnomalyScore: number;
}>(firstDataset: Dataset, secondDataset: Dataset) => number;
export declare const sortRT: <Fields extends rt.Mixed>(fields: Fields) => rt.TypeC<{
    field: Fields;
    direction: rt.KeyofC<{
        asc: null;
        desc: null;
    }>;
}>;
export declare const paginationCursorRT: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
export type PaginationCursor = rt.TypeOf<typeof paginationCursorRT>;
export declare const paginationRT: rt.IntersectionC<[rt.TypeC<{
    pageSize: rt.NumberC;
}>, rt.PartialC<{
    cursor: rt.UnionC<[rt.TypeC<{
        searchBefore: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
    }>, rt.TypeC<{
        searchAfter: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
    }>]>;
}>]>;
export type Pagination = rt.TypeOf<typeof paginationRT>;
