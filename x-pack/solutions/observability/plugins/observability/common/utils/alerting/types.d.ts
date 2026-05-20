import type { ALERT_GROUP, TAGS } from '@kbn/rule-data-utils';
import type { Group } from '../../typings';
export interface ObservabilityFields {
    [ALERT_GROUP]?: Group[];
    [TAGS]?: string[];
}
