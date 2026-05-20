import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { SloItem } from '../types';
import type { SloEmbeddableDeps } from '../types';
interface Props {
    deps: SloEmbeddableDeps;
    slos: SloItem[];
    timeRange: TimeRange;
    onLoaded?: () => void;
    lastReloadRequestTime: number | undefined;
}
/**
 * Builds a filter for one SLO. slo_instance_id alone drives behavior:
 * - "*" = match all instances (no instance filter)
 * - specific id = filter to that instance only
 */
export declare const getSloInstanceFilter: (sloId: string, sloInstanceId: string) => {
    bool: {
        must: ({
            term: {
                'slo.id': string;
                'slo.instanceId'?: undefined;
            };
        } | {
            term: {
                'slo.instanceId': string;
                'slo.id'?: undefined;
            };
        })[];
    };
};
export declare const useSloAlertsQuery: (slos: SloItem[], timeRange: TimeRange) => {
    bool?: import("@elastic/elasticsearch/lib/api/types").QueryDslBoolQuery | undefined;
} & {
    type?: undefined;
    nested?: undefined;
    prefix?: undefined;
    match?: undefined;
    script?: undefined;
    boosting?: undefined;
    common?: undefined;
    combined_fields?: undefined;
    constant_score?: undefined;
    dis_max?: undefined;
    distance_feature?: undefined;
    exists?: undefined;
    function_score?: undefined;
    fuzzy?: undefined;
    geo_bounding_box?: undefined;
    geo_distance?: undefined;
    geo_grid?: undefined;
    geo_polygon?: undefined;
    geo_shape?: undefined;
    has_child?: undefined;
    has_parent?: undefined;
    ids?: undefined;
    intervals?: undefined;
    knn?: undefined;
    match_all?: undefined;
    match_bool_prefix?: undefined;
    match_none?: undefined;
    match_phrase?: undefined;
    match_phrase_prefix?: undefined;
    more_like_this?: undefined;
    multi_match?: undefined;
    parent_id?: undefined;
    percolate?: undefined;
    pinned?: undefined;
    query_string?: undefined;
    range?: undefined;
    rank_feature?: undefined;
    regexp?: undefined;
    rule?: undefined;
    script_score?: undefined;
    semantic?: undefined;
    shape?: undefined;
    simple_query_string?: undefined;
    span_containing?: undefined;
    span_field_masking?: undefined;
    span_first?: undefined;
    span_multi?: undefined;
    span_near?: undefined;
    span_not?: undefined;
    span_or?: undefined;
    span_term?: undefined;
    span_within?: undefined;
    sparse_vector?: undefined;
    term?: undefined;
    terms?: undefined;
    terms_set?: undefined;
    text_expansion?: undefined;
    weighted_tokens?: undefined;
    wildcard?: undefined;
    wrapper?: undefined;
};
export declare function SloAlertsTable({ deps: { data, http, notifications, fieldFormats, application, licensing, cases, settings }, slos, timeRange, onLoaded, lastReloadRequestTime, }: Props): React.JSX.Element;
export {};
