import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Group } from '../../typings';
export declare const getGroupQueries: (groups?: Group[], groupFieldName?: string) => QueryDslQueryContainer[];
export declare const getGroupFilters: (groups?: Group[], groupFieldName?: string) => Filter[];
export declare const getGroups: (fields?: string[], values?: string[]) => Group[];
