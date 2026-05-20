import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ObservabilityFields } from '../../../../../common/utils/alerting/types';
import type { TopAlert } from '../../../../typings/alerts';
interface Props {
    alert: TopAlert<ObservabilityFields>;
    filterProximal: boolean;
}
export declare function getBuildRelatedAlertsQuery({ alert, filterProximal, }: Props): NonNullable<QueryDslQueryContainer>;
export {};
