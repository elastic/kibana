import type { Query, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { CustomThresholdSearchSourceFields } from '../../../../common/custom_threshold_rule/types';
export declare const defaultQuery: Query;
export declare const getSearchConfiguration: (fields: SerializedSearchSourceFields, onWarning: (title: string) => void) => CustomThresholdSearchSourceFields;
