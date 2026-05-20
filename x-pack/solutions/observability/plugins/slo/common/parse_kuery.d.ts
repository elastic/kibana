import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { QuerySchema } from '@kbn/slo-schema';
import type { DataViewBase } from '@kbn/es-query';
export declare function getElasticsearchQueryOrThrow(kuery?: QuerySchema, dataView?: DataViewBase): QueryDslQueryContainer;
