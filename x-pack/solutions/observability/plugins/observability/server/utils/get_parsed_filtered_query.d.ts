import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery, DataViewBase, EsQueryConfig, Filter } from '@kbn/es-query';
import type { SearchConfigurationType } from '../../common/custom_threshold_rule/types';
export declare const getParsedFilterQuery: (filter: string | undefined, dataView?: DataViewBase) => NonNullable<QueryDslQueryContainer>[];
export declare const getSearchConfigurationBoolQuery: (searchConfiguration: SearchConfigurationType, additionalFilters: Filter[], dataView?: DataViewBase, esQueryConfig?: EsQueryConfig) => {
    bool: BoolQuery;
};
