import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { WindowSchema } from '../typings';
export interface SloRule extends Record<string, unknown> {
    windows: WindowSchema[];
}
export interface UseFetchSLOsWithBurnRateRuleParams {
    search?: string;
}
export interface UseFetchSLOsWithBurnRateRulesResponse {
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    data: Array<Rule<SloRule>> | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<Array<Rule<SloRule>> | undefined, unknown>>;
}
export declare function useFetchSLOsWithBurnRateRules({ search, }: UseFetchSLOsWithBurnRateRuleParams): UseFetchSLOsWithBurnRateRulesResponse;
