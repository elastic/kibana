import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
/**
 * Converts a KQL string into a nested Elasticsearch query targeting
 * influencer fields in ML anomaly records.
 *
 * ML anomaly records store influencer data as nested objects
 * (`influencers.influencer_field_name` / `influencers.influencer_field_values`),
 * so standard KQL-to-ES conversion doesn't work directly. This function
 * uses the standard KQL→DSL pipeline, then rewrites leaf field queries
 * into the nested influencer structure while preserving bool logic.
 */
export declare function kqlToInfluencerQuery(influencerFilter?: string): QueryDslQueryContainer | undefined;
