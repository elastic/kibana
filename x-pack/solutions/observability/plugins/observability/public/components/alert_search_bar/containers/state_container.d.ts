import { type FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import type { AlertStatus } from '../../../../common/typings';
import type { AlertSearchBarContainerState } from '../types';
interface AlertSearchBarStateTransitions {
    setRangeFrom: (state: AlertSearchBarContainerState) => (rangeFrom: string) => AlertSearchBarContainerState;
    setRangeTo: (state: AlertSearchBarContainerState) => (rangeTo: string) => AlertSearchBarContainerState;
    setKuery: (state: AlertSearchBarContainerState) => (kuery: string) => AlertSearchBarContainerState;
    setStatus: (state: AlertSearchBarContainerState) => (status: AlertStatus) => AlertSearchBarContainerState;
    setFilters: (state: AlertSearchBarContainerState) => (filters: Filter[]) => AlertSearchBarContainerState;
    setSavedQueryId: (state: AlertSearchBarContainerState) => (savedQueryId?: string) => AlertSearchBarContainerState;
    setControlConfigs: (state: AlertSearchBarContainerState) => (controlConfigs: FilterControlConfig[]) => AlertSearchBarContainerState;
    setGroupings: (state: AlertSearchBarContainerState) => (groupings: string[]) => AlertSearchBarContainerState;
}
declare const DEFAULT_STATE: AlertSearchBarContainerState;
declare const alertSearchBarStateContainer: import("@kbn/kibana-utils-plugin/public").ReduxLikeStateContainer<AlertSearchBarContainerState, AlertSearchBarStateTransitions, {}>;
type AlertSearchBarStateContainer = typeof alertSearchBarStateContainer;
declare const Provider: import("react").Provider<import("@kbn/kibana-utils-plugin/public").ReduxLikeStateContainer<AlertSearchBarContainerState, AlertSearchBarStateTransitions, {}>>, useContainer: () => import("@kbn/kibana-utils-plugin/public").ReduxLikeStateContainer<AlertSearchBarContainerState, AlertSearchBarStateTransitions, {}>;
export { Provider, alertSearchBarStateContainer, useContainer, DEFAULT_STATE };
export type { AlertSearchBarStateContainer, AlertSearchBarContainerState, AlertSearchBarStateTransitions, };
