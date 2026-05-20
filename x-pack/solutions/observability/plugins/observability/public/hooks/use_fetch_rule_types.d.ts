import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import type { RuleType } from '@kbn/triggers-actions-ui-plugin/public';
export interface UseFetchRuleTypesResponse {
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    ruleTypes: RuleType[] | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<RuleType[] | undefined, unknown>>;
}
export declare function useFetchRuleTypes({ filterByRuleTypeIds, }: {
    filterByRuleTypeIds?: string[] | undefined;
}): UseFetchRuleTypesResponse;
