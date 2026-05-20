import * as t from 'io-ts';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { AlertSearchBarContainerState } from './state_container';
export declare const alertSearchBarState: t.PartialC<{
    rangeFrom: t.Type<string, string, unknown>;
    rangeTo: t.Type<string, string, unknown>;
    kuery: t.StringC;
    status: t.UnionC<[t.LiteralC<"active">, t.LiteralC<"recovered">, t.LiteralC<"all">, t.LiteralC<"untracked">]>;
    groupings: t.ArrayC<t.StringC>;
}>;
export declare function useAlertSearchBarStateContainer(urlStorageKey: string, { replace }?: {
    replace?: boolean;
}, defaultState?: AlertSearchBarContainerState): {
    kuery: string;
    onKueryChange: (kuery: string) => AlertSearchBarContainerState;
    onRangeFromChange: (rangeFrom: string) => AlertSearchBarContainerState;
    onRangeToChange: (rangeTo: string) => AlertSearchBarContainerState;
    onStatusChange: (status: import("../../../../common/typings").AlertStatus) => AlertSearchBarContainerState;
    onFiltersChange: (filters: import("@kbn/es-query").Filter[]) => AlertSearchBarContainerState;
    onControlConfigsChange: (controlConfigs: import("@kbn/alerts-ui-shared").FilterControlConfig[]) => AlertSearchBarContainerState;
    onGroupingsChange: (groupings: string[]) => AlertSearchBarContainerState;
    controlConfigs: import("@kbn/alerts-ui-shared").FilterControlConfig[] | undefined;
    filters: import("@kbn/es-query").Filter[] | undefined;
    rangeFrom: string;
    rangeTo: string;
    status: import("../../../../common/typings").AlertStatus | undefined;
    savedQuery: SavedQuery | undefined;
    setSavedQuery: import("react").Dispatch<import("react").SetStateAction<SavedQuery | undefined>>;
    groupings: string[] | undefined;
};
