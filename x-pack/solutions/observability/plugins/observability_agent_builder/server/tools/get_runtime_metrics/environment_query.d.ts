import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
/**
 * Generates an Elasticsearch query filter for service environment.
 * - Empty string or undefined: no filter (all environments)
 * - 'ENVIRONMENT_ALL': no filter (all environments)
 * - 'ENVIRONMENT_NOT_DEFINED': matches docs where environment is not set
 * - Any other value: matches docs with that specific environment
 */
export declare function environmentQuery(environment: string | undefined): QueryDslQueryContainer[];
