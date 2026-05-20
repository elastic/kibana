import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
export interface UseFetchRuleResponse {
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    rule: Rule | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<Rule | undefined, unknown>>;
}
export declare function useFetchRule({ ruleId }: {
    ruleId?: string;
}): UseFetchRuleResponse;
