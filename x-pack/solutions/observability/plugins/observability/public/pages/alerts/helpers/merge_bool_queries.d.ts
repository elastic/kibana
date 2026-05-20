import type { BoolQuery } from '@kbn/es-query';
export declare const mergeBoolQueries: (firstQuery: {
    bool: BoolQuery;
}, secondQuery: {
    bool: BoolQuery;
}) => {
    bool: BoolQuery;
};
