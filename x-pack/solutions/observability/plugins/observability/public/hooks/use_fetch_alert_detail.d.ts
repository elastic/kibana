import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import type { TopAlert } from '../typings/alerts';
export interface AlertData {
    formatted: TopAlert;
    raw: EcsFieldsResponse;
}
export declare const useFetchAlertDetail: (id: string) => [boolean, AlertData | null];
